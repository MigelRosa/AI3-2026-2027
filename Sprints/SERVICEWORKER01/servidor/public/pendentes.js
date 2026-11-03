import {
    lerPendentes,
    marcarErro,
    confirmarPendente
} from './bd.js';

import { pedidoAPI } from './api.js';

let aEnviar = false;

export async function enviarPendentes(utilizadorAtual) {
    if (aEnviar) return;

    aEnviar = true;

    try {
        const pendentes = await lerPendentes();

        for (const pendente of pendentes) {
            if (
                String(pendente.utilizador) !== String(utilizadorAtual) ||
                pendente.erro
            ) {
                continue;
            }

            try {
                const resposta = await pedidoAPI('/sugestoes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        titulo: pendente.titulo,
                        descricao: pendente.descricao,
                        categoria: pendente.categoria
                    })
                });

                if (resposta.status === 201) {
                    const dados = await resposta.json();

                    await confirmarPendente(
                        pendente.idLocal,
                        dados
                    );

                } else if (resposta.status === 400) {
                    const erro = await resposta.json();

                    await marcarErro(
                        pendente.idLocal,
                        erro.mensagem || 'Dados inválidos.'
                    );

                } else if (resposta.status === 401) {
                    document.dispatchEvent(
                        new CustomEvent('sessao-expirada')
                    );
                    return;
                } else {
                    await marcarErro(
                        pendente.idLocal,
                        'Erro ao enviar a sugestão.'
                    );
                }

            } catch (erro) {
                console.error('Erro ao enviar pendente:', erro);
                return;
            }
        }

    } finally {
        aEnviar = false;
    }
}