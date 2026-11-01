import { lerConfiguracoes, guardarConfiguracoes } from './configuracoes.js';
const entrada = document.getElementById('entrada');
const sessao = document.getElementById('sessao');
const formLogin = document.getElementById('formLogin');
const mensagem = document.getElementById('mensagem');

const nomeUtilizador = document.getElementById('nomeUtilizador');
const papelUtilizador = document.getElementById('papelUtilizador');
const horaExpiracao = document.getElementById('horaExpiracao');
const tempoRestante = document.getElementById('tempoRestante');
const formNovaSugestao = document.getElementById('formNovaSugestao');
const formularioSugestao = document.getElementById('novaSugestao');
const tituloSugestao = document.getElementById('tituloSugestao');
const descricaoSugestao = document.getElementById('descricaoSugestao');
const categoriaSugestao = document.getElementById('categoriaSugestao');
const btnSugestoes = document.getElementById('btnSugestoes');
const btnSair = document.getElementById('btnSair');
const listaSugestoes = document.getElementById('listaSugestoes');
// Configurações
let configuracoes = lerConfiguracoes();

const seletorTema = document.getElementById('tema');
const seletorOrdenacao = document.getElementById('ordenacao');

// Aplicar configurações guardadas ao abrir a página
function aplicarConfiguracoes() {
    seletorTema.value = configuracoes.tema;
    seletorOrdenacao.value = configuracoes.ordenacao;

    document.documentElement.dataset.tema = configuracoes.tema;
}

aplicarConfiguracoes();

// Guardar e aplicar alterações imediatamente
seletorTema.addEventListener('change', () => {
    configuracoes.tema = seletorTema.value;
    guardarConfiguracoes(configuracoes);
    aplicarConfiguracoes();
});

seletorOrdenacao.addEventListener('change', () => {
    configuracoes.ordenacao = seletorOrdenacao.value;
    guardarConfiguracoes(configuracoes);
});


let intervaloExpiracao = null;
let instanteExpiracao = null;

function mostrarMensagem(texto) {
    mensagem.textContent = texto;
}

function terminarSessaoLocal(texto = '') {
    sessionStorage.removeItem('rascunhoSugestao');
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
        terminarSessaoLocal(
            'Sessão expirada. É necessária nova autenticação.'
        );
    }
}

// Apresentar os dados da sessão recebidos do servidor
function apresentarSessao(dados) {
    instanteExpiracao = new Date(dados.expiracao).getTime();

    nomeUtilizador.textContent = dados.nome;
    papelUtilizador.textContent = dados.papel;

    horaExpiracao.textContent =
        new Date(instanteExpiracao).toLocaleString('pt-PT');

    btnSugestoes.textContent =
        dados.papel === 'servicos'
            ? 'Todas as sugestões'
            : 'As minhas sugestões';

    entrada.hidden = true;
    sessao.hidden = false;

    atualizarTempoRestante();

    intervaloExpiracao = setInterval(
        atualizarTempoRestante,
        1000
    );
    // Mostrar o formulário apenas aos alunos
    if (dados.papel === 'aluno') {
        formNovaSugestao.hidden = false;

        // Recuperar rascunho guardado
        const rascunho = sessionStorage.getItem('rascunhoSugestao');

        if (rascunho) {
            try {
                const dadosRascunho = JSON.parse(rascunho);

                tituloSugestao.value = dadosRascunho.titulo || '';
                descricaoSugestao.value = dadosRascunho.descricao || '';
                categoriaSugestao.value = dadosRascunho.categoria || '';
            } catch {
                sessionStorage.removeItem('rascunhoSugestao');
            }
        }
    } else {
        formNovaSugestao.hidden = true;
    }
}
// Guardar automaticamente o rascunho enquanto o aluno escreve
function guardarRascunho() {
    const rascunho = {
        titulo: tituloSugestao.value,
        descricao: descricaoSugestao.value,
        categoria: categoriaSugestao.value
    };

    sessionStorage.setItem(
        'rascunhoSugestao',
        JSON.stringify(rascunho)
    );
}

tituloSugestao.addEventListener('input', () => {
    guardarRascunho();
    console.log('Rascunho guardado:', sessionStorage.getItem('rascunhoSugestao'));
});
descricaoSugestao.addEventListener('input', guardarRascunho);
categoriaSugestao.addEventListener('change', guardarRascunho);

// Consultar a sessão através do cookie
async function verificarSessao() {
    try {
        const resposta = await fetch('/v2/sessao');

        if (resposta.status === 401) {
            terminarSessaoLocal();
            return;
        }

        if (!resposta.ok) {
            terminarSessaoLocal('Erro ao verificar a sessão.');
            return;
        }

        const dados = await resposta.json();
        apresentarSessao(dados);

    } catch (erro) {
        terminarSessaoLocal(
            'Não foi possível contactar o servidor.'
        );
    }
}

// Iniciar sessão
formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    mostrarMensagem('');

    const utilizador = document.getElementById('utilizador').value;
    const palavraPasse = document.getElementById('palavraPasse').value;

    try {
        const resposta = await fetch('/v2/sessao', {
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

        if (!resposta.ok) {
            mostrarMensagem(dados.mensagem || 'Erro ao iniciar sessão.');
            return;
        }

        document.getElementById('palavraPasse').value = '';

        apresentarSessao(dados);
        mostrarMensagem('Sessão iniciada com sucesso.');

    } catch (erro) {
        mostrarMensagem('Não foi possível contactar o servidor.');
    }
});

// Consultar sugestões
btnSugestoes.addEventListener('click', async () => {
    mostrarMensagem('');
    listaSugestoes.replaceChildren();

    try {
        const resposta = await fetch('/v2/sugestoes');

        if (resposta.status === 401) {
            terminarSessaoLocal(
                'Sessão expirada. É necessária nova autenticação.'
            );
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem('Não foi possível carregar as sugestões.');
            return;
        }

        const itensOrdenados = [...dados.itens];

        if (configuracoes.ordenacao === 'recentes') {
            // IDs mais elevados correspondem às sugestões mais recentes
            itensOrdenados.sort((a, b) => b.id - a.id);
        } else if (configuracoes.ordenacao === 'estado') {
            // Ordenar alfabeticamente pelo estado
            itensOrdenados.sort((a, b) =>
                a.estado.localeCompare(b.estado, 'pt')
            );
        }

        itensOrdenados.forEach((sugestao) => {
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

// Terminar sessão no servidor
btnSair.addEventListener('click', async () => {
    try {
        const resposta = await fetch('/v2/sessao', {
            method: 'DELETE'
        });

        if (resposta.status === 204 || resposta.status === 401) {
            terminarSessaoLocal('Sessão terminada.');
        } else {
            mostrarMensagem('Não foi possível terminar a sessão.');
        }

    } catch (erro) {
        mostrarMensagem('Não foi possível contactar o servidor.');
    }
});

// Verificar a sessão quando a página abre
verificarSessao();
// Enviar nova sugestão
formularioSugestao.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const sugestao = {
        titulo: tituloSugestao.value,
        descricao: descricaoSugestao.value,
        categoria: categoriaSugestao.value
    };

    try {
        const resposta = await fetch('/v2/sugestoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sugestao)
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem(dados.erro || 'Erro ao criar sugestão.');
            return;
        }

        // Apagar o rascunho após criação bem-sucedida
        sessionStorage.removeItem('rascunhoSugestao');

        formularioSugestao.reset();

        mostrarMensagem('Sugestão criada com sucesso!');
    } catch (erro) {
        mostrarMensagem('Não foi possível comunicar com o servidor.');
    }
});
