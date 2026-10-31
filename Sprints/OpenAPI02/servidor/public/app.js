
const entrada = document.getElementById('entrada');
const sessao = document.getElementById('sessao');
const formLogin = document.getElementById('formLogin');
const mensagem = document.getElementById('mensagem');

const nomeUtilizador = document.getElementById('nomeUtilizador');
const papelUtilizador = document.getElementById('papelUtilizador');
const horaExpiracao = document.getElementById('horaExpiracao');
const tempoRestante = document.getElementById('tempoRestante');

const btnSugestoes = document.getElementById('btnSugestoes');
const btnSair = document.getElementById('btnSair');
const listaSugestoes = document.getElementById('listaSugestoes');

let tokenJWT = null;
let intervaloExpiracao = null;
let instanteExpiracao = null;

// Descodificar o payload do JWT em UTF-8
function descodificarPayload(token) {
  const partes = token.split('.');

  if (partes.length !== 3) {
    throw new Error('Token JWT inválido.');
  }

  let base64 = partes[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  base64 = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    '='
  );

  const binario = atob(base64);

  const bytes = Uint8Array.from(
    binario,
    caracter => caracter.charCodeAt(0)
  );

  const texto = new TextDecoder('utf-8').decode(bytes);

  return JSON.parse(texto);
}

// Apresentar mensagens
function mostrarMensagem(texto) {
  mensagem.textContent = texto;
}

// Terminar sessão
function terminarSessao(texto = 'Sessão terminada.') {
  tokenJWT = null;

  if (intervaloExpiracao !== null) {
    clearInterval(intervaloExpiracao);
    intervaloExpiracao = null;
  }

  instanteExpiracao = null;

  entrada.hidden = false;
  sessao.hidden = true;

  formLogin.reset();
  listaSugestoes.replaceChildren();

  nomeUtilizador.textContent = '';
  papelUtilizador.textContent = '';
  horaExpiracao.textContent = '';
  tempoRestante.textContent = '';

  btnSugestoes.textContent = 'As minhas sugestões';

  mostrarMensagem(texto);
}

// Atualizar o tempo restante
function atualizarTempoRestante() {
  const segundos = Math.max(
    0,
    Math.ceil((instanteExpiracao - Date.now()) / 1000)
  );

  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = segundos % 60;

  tempoRestante.textContent =
    `${minutos} min ${segundosRestantes} s`;

  if (segundos === 0) {
    terminarSessao(
      'Sessão expirada. É necessária nova autenticação.'
    );
  }
}

// Pedidos protegidos
async function pedidoAutenticado(url) {
  const resposta = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${tokenJWT}`
    }
  });

  if (resposta.status === 401) {
    terminarSessao(
      'Sessão expirada. É necessária nova autenticação.'
    );

    return null;
  }

  return resposta;
}

// Iniciar sessão
formLogin.addEventListener('submit', async (event) => {
  event.preventDefault();

  mostrarMensagem('');

  const utilizador = document.getElementById('utilizador').value;
  const palavraPasse = document.getElementById('palavraPasse').value;

  try {
    const resposta = await fetch('/v2/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        utilizador,
        palavraPasse
      })
    });

    const dados = await resposta.json();

    if (resposta.status === 400 || resposta.status === 401) {
      mostrarMensagem(dados.mensagem);
      return;
    }

    if (!resposta.ok) {
      mostrarMensagem('Ocorreu um erro ao iniciar sessão.');
      return;
    }

    tokenJWT = dados.token;

    const payload = descodificarPayload(tokenJWT);

    instanteExpiracao = payload.exp * 1000;

    if (
      !payload.sub ||
      !payload.nome ||
      !payload.papel ||
      !Number.isFinite(instanteExpiracao) ||
      instanteExpiracao <= Date.now()
    ) {
      terminarSessao('Não foi possível validar a sessão.');
      return;
    }

    nomeUtilizador.textContent = payload.nome;
    papelUtilizador.textContent = payload.papel;

    horaExpiracao.textContent =
      new Date(instanteExpiracao).toLocaleString('pt-PT');

    btnSugestoes.textContent =
      payload.papel === 'servicos'
        ? 'Todas as sugestões'
        : 'As minhas sugestões';

    document.getElementById('palavraPasse').value = '';

    entrada.hidden = true;
    sessao.hidden = false;

    atualizarTempoRestante();

    intervaloExpiracao = setInterval(
      atualizarTempoRestante,
      1000
    );

    mostrarMensagem('Sessão iniciada com sucesso.');

  } catch (erro) {
    tokenJWT = null;
    mostrarMensagem(
      'Não foi possível contactar o servidor.'
    );
  }
});

// Consultar sugestões
btnSugestoes.addEventListener('click', async () => {
  if (!tokenJWT) return;

  mostrarMensagem('');
  listaSugestoes.replaceChildren();

  try {
    const resposta = await pedidoAutenticado('/v2/sugestoes');

    if (!resposta) return;

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarMensagem('Não foi possível carregar as sugestões.');
      return;
    }

    dados.itens.forEach((sugestao) => {
      const artigo = document.createElement('article');

      const titulo = document.createElement('h3');
      titulo.textContent = sugestao.titulo;

      const categoria = document.createElement('p');
      categoria.textContent = `Categoria: ${sugestao.categoria}`;

      const estado = document.createElement('p');
      estado.textContent = `Estado: ${sugestao.estado}`;

      artigo.append(titulo, categoria, estado);
      listaSugestoes.appendChild(artigo);
    });

    if (dados.itens.length === 0) {
      mostrarMensagem('Não existem sugestões para apresentar.');
    }

  } catch (erro) {
    mostrarMensagem('Erro de rede ao carregar as sugestões.');
  }
});

// Terminar sessão manualmente
btnSair.addEventListener('click', () => {
  terminarSessao();
});
