const API_BASE = '/v2';

export async function pedidoAPI(caminho, opcoes = {}) {
    const resposta = await fetch(`${API_BASE}${caminho}`, {
        ...opcoes,
        credentials: 'same-origin',
        headers: {
            ...opcoes.headers
        }
    });

    return resposta;
}
