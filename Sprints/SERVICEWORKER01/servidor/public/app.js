import { lerConfiguracoes, guardarConfiguracoes } from './configuracoes.js';
import { pedidoAPI } from './api.js';
import { enviarPendentes } from './pendentes.js';
import {
    guardarProprietario,
    lerProprietario,
    limparBD,
    substituirSugestoes,
    lerSugestoes,
    acrescentarPendente
} from './bd.js';
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
let registoSW;
let recarregarQuandoControlado = false;

// Aplicar configurações guardadas ao abrir a página
function aplicarConfiguracoes() {
    seletorTema.value = configuracoes.tema;
    seletorOrdenacao.value = configuracoes.ordenacao;

    document.documentElement.dataset.tema = configuracoes.tema;
}

aplicarConfiguracoes();


async function prepararProprietario(sessao) {
    const anterior = await lerProprietario();

    // Se for outro utilizador, eliminar os dados anteriores
    if (
        anterior &&
        String(anterior.utilizador) !== String(sessao.utilizador)
    ) {
        await limparBD();
        console.log('Dados do utilizador anterior eliminados.');
    }

    await guardarProprietario(sessao);
}

// Guardar e aplicar alterações imediatamente
seletorTema.addEventListener('change', () => {
    configuracoes.tema = seletorTema.value;
    guardarConfiguracoes(configuracoes);
    aplicarConfiguracoes();
});

seletorOrdenacao.addEventListener('change', async () => {
    configuracoes.ordenacao = seletorOrdenacao.value;
    guardarConfiguracoes(configuracoes);

    if (estadoAtual === 'com-sessao') {
        await apresentarSugestoes();
    }
});

let intervaloExpiracao = null;
let instanteExpiracao = null;
let estadoAtual = 'a-verificar';

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

    formLogin.reset();
    listaSugestoes.replaceChildren();

    nomeUtilizador.textContent = '';
    papelUtilizador.textContent = '';
    horaExpiracao.textContent = '';
    tempoRestante.textContent = '';

    btnSugestoes.textContent = 'As minhas sugestões';

    mostrarMensagem(texto);
}

formNovaSugestao.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dados = {
        titulo: tituloSugestao.value.trim(),
        descricao: descricaoSugestao.value.trim(),
        categoria: categoriaSugestao.value
    };

    if (!formularioSugestao.reportValidity()) return;

    const proprietario = await lerProprietario();

    if (!proprietario) {
        mostrarMensagem('Não foi possível identificar o utilizador.');
        return;
    }

    try {
        const resposta = await pedidoAPI('/sugestoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        if (resposta.status === 201) {
            const sugestao = await resposta.json();

            await substituirSugestoes([
                sugestao,
                ...(await lerSugestoes())
            ]);

            formNovaSugestao.reset();
            sessionStorage.removeItem('rascunho');

            mostrarMensagem('Sugestão submetida com sucesso.');
            await apresentarSugestoes();

        } else if (resposta.status === 400) {
            const erro = await resposta.json();
            mostrarMensagem(erro.mensagem || 'Verifica os dados introduzidos.');

        } else if (resposta.status === 401) {
            mudarEstado('sem-sessao');
            mostrarMensagem('A sessão expirou. Entre de novo.');

        } else {
            mostrarMensagem('Não foi possível submeter a sugestão.');
        }

    } catch (erro) {
        console.error('Erro ao submeter sugestão:', erro);

        await acrescentarPendente(
            dados,
            proprietario.utilizador
        );

        formNovaSugestao.reset();
        sessionStorage.removeItem('rascunho');

        mostrarMensagem('Sem ligação. A sugestão ficou guardada e será enviada mais tarde.');
    }
});

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
async function registarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Este navegador não suporta Service Workers.');
        return;
    }

    try {
        registoSW = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        console.log('Service Worker registado.');

        // Verificar se já existe uma atualização à espera
        if (registoSW.waiting) {
            mostrarBotaoAtualizar();
        }

        // Detetar uma nova versão
        registoSW.addEventListener('updatefound', () => {
            const novoSW = registoSW.installing;

            novoSW.addEventListener('statechange', () => {
                if (
                    novoSW.state === 'installed' &&
                    navigator.serviceWorker.controller
                ) {
                    mostrarBotaoAtualizar();
                }
            });
        });

        // Verificar atualizações disponíveis
        registoSW.update();

    } catch (erro) {
        console.error('Erro ao registar Service Worker:', erro);
    }
}

export async function sincronizarPendentes() {
    const proprietario = await lerProprietario();

    if (!proprietario) return;

    await enviarPendentes(proprietario.utilizador);

    await apresentarSugestoes();
}

async function verificarSessao() {
    mudarEstado('a-verificar');
    

    try {
        const resposta = await pedidoAPI('/sessao');

        if (resposta.status === 401) {
            terminarSessaoLocal();
            mudarEstado('sem-sessao');
            return;
        }

        if (!resposta.ok) {
            mostrarMensagem('Erro ao verificar a sessão.');
            return;
        }

        const dados = await resposta.json();

        await prepararProprietario(dados);

        apresentarSessao(dados);
        mudarEstado('com-sessao');
        sincronizarPendentes();

    } catch (erro) {
        console.error('Erro ao verificar sessão:', erro);

        mostrarMensagem('Não foi possível contactar o servidor.');
        mudarEstado('sem-ligacao');
    }
}


// Iniciar sessão

formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    mostrarMensagem('');

    const utilizador = document.getElementById('utilizador').value;
    const palavraPasse = document.getElementById('palavraPasse').value;
    const botao = event.submitter;

    if (botao) {
        botao.disabled = true;
        botao.textContent = 'A entrar...';
    }

    try {
        const resposta = await pedidoAPI('/sessao', {
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

        if (resposta.status === 200) {
            await prepararProprietario(dados);

            document.getElementById('palavraPasse').value = '';

            apresentarSessao(dados);
            mudarEstado('com-sessao');
            sincronizarPendentes();

            mostrarMensagem('Sessão iniciada com sucesso.');
        } else if (
            resposta.status === 400 ||
            resposta.status === 401
        ) {
            mostrarMensagem(
                dados.mensagem || 'Credenciais inválidas.'
            );

            document.getElementById('palavraPasse').value = '';
            document.getElementById('palavraPasse').focus();

            mudarEstado('sem-sessao');
        } else {
            mostrarMensagem('Erro ao iniciar sessão.');
        }

    } catch (erro) {
        console.error('Erro de ligação:', erro);

        mudarEstado('sem-ligacao');
        mostrarMensagem('Sem ligação: não é possível entrar.');

    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = 'Entrar';
        }
    }
});


// Consultar sugestões

btnSugestoes.addEventListener('click', async () => {
    mostrarMensagem('');

    try {
        const resposta = await pedidoAPI('/sugestoes');

        if (resposta.status === 401) {
            terminarSessaoLocal(
                'Sessão expirada. É necessária nova autenticação.'
            );

            mudarEstado('sem-sessao');
            return;
        }

        if (!resposta.ok) {
            mostrarMensagem('Não foi possível carregar as sugestões.');
            return;
        }

        const dados = await resposta.json();

        // Guardar a resposta no IndexedDB
        await substituirSugestoes(dados.itens);

        // Apresentar os dados a partir do IndexedDB
        await apresentarSugestoes();

        mostrarMensagem(
            `Atualizado às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
        );

    } catch (erro) {
        console.error('Erro ao carregar sugestões:', erro);
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
formularioSugestao.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dados = {
        titulo: tituloSugestao.value.trim(),
        descricao: descricaoSugestao.value.trim(),
        categoria: categoriaSugestao.value
    };

    if (!formularioSugestao.reportValidity()) return;

    const proprietario = await lerProprietario();

    if (!proprietario) {
        mostrarMensagem('Não foi possível identificar o utilizador.');
        return;
    }

    try {
        const resposta = await pedidoAPI('/sugestoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        if (resposta.status === 201) {
            const sugestao = await resposta.json();

            await substituirSugestoes([
                sugestao,
                ...(await lerSugestoes())
            ]);

            formularioSugestao.reset();
            sessionStorage.removeItem('rascunhoSugestao');

            mostrarMensagem('Sugestão submetida com sucesso.');
            await apresentarSugestoes();

        } else if (resposta.status === 400) {
            const erro = await resposta.json();

            mostrarMensagem(
                erro.mensagem || 'Verifica os dados introduzidos.'
            );

        } else if (resposta.status === 401) {
            mudarEstado('sem-sessao');
            mostrarMensagem('A sessão expirou. Entre de novo.');

        } else {
            mostrarMensagem('Não foi possível submeter a sugestão.');
        }

    } catch (erro) {
        console.error('Erro ao submeter sugestão:', erro);

        await acrescentarPendente(
            dados,
            proprietario.utilizador
        );

        formularioSugestao.reset();
        sessionStorage.removeItem('rascunhoSugestao');

        mostrarMensagem(
            'Sem ligação. A sugestão ficou guardada e será enviada mais tarde.'
        );
    }
});





function mostrarBotaoAtualizar() {
    const botao = document.getElementById('atualizar-app');

    if (botao) {
        botao.hidden = false;
    }
}

// Ativar a nova versão quando o utilizador clicar
function atualizarAplicacao() {
    if (registoSW && registoSW.waiting) {
        recarregarQuandoControlado = true;

        registoSW.waiting.postMessage({
            tipo: 'ativar'
        });
    }
}

// Recarregar depois da nova versão assumir o controlo
navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (recarregarQuandoControlado) {
        window.location.reload();
    }
});

// Registar quando a página estiver pronta
registarServiceWorker();


function mudarEstado(estado) {
    const estadosPermitidos = [
        'a-verificar',
        'sem-sessao',
        'com-sessao',
        'sem-ligacao'
    ];

    if (!estadosPermitidos.includes(estado)) {
        console.error('Estado inválido:', estado);
        return;
    }

    estadoAtual = estado;

    // Registar o estado atual no body
    document.body.dataset.estado = estado;

    // Mostrar apenas a área correspondente
    document.querySelectorAll('[data-area]').forEach((area) => {
        area.hidden = area.dataset.area !== estado;
    });
}
window.mudarEstado = mudarEstado;


async function apresentarSugestoes() {
    const itens = await lerSugestoes(configuracoes.ordenacao);

    listaSugestoes.replaceChildren();

    itens.forEach((sugestao) => {
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

    if (itens.length === 0) {
        mostrarMensagem('Não existem sugestões para apresentar.');
    }
}

window.addEventListener('online', async () => {
    await verificarSessao();
});