
const NOME_BD = 'sugestoes-bd';
const VERSAO_BD = 1;

let ligacaoBD = null;

function abrirBD() {
    return new Promise((resolve, reject) => {
        if (ligacaoBD) {
            resolve(ligacaoBD);
            return;
        }

        const pedido = indexedDB.open(NOME_BD, VERSAO_BD);

        pedido.onupgradeneeded = (event) => {
            const bd = event.target.result;

            // Sugestões guardadas localmente
            if (!bd.objectStoreNames.contains('sugestoes')) {
                const sugestoes = bd.createObjectStore('sugestoes', {
                    keyPath: 'id'
                });

                sugestoes.createIndex('porEstado', 'estado', {
                    unique: false
                });

                sugestoes.createIndex('porData', 'dataCriacao', {
                    unique: false
                });
            }

            // Sugestões por enviar
            if (!bd.objectStoreNames.contains('pendentes')) {
                bd.createObjectStore('pendentes', {
                    keyPath: 'idLocal',
                    autoIncrement: true
                });
            }

            // Informação do utilizador autenticado
            if (!bd.objectStoreNames.contains('meta')) {
                bd.createObjectStore('meta', {
                    keyPath: 'chave'
                });
            }
        };

        pedido.onsuccess = () => {
            ligacaoBD = pedido.result;

            ligacaoBD.onclose = () => {
                ligacaoBD = null;
            };

            resolve(ligacaoBD);
        };

        pedido.onerror = () => {
            reject(pedido.error);
        };
    });
}

export function substituirSugestoes(lista) {
    return abrirBD().then((bd) => {
        return new Promise((resolve, reject) => {
            const transacao = bd.transaction(
                ['sugestoes', 'meta'],
                'readwrite'
            );

            const storeSugestoes = transacao.objectStore('sugestoes');
            const storeMeta = transacao.objectStore('meta');

            storeSugestoes.clear();

            lista.forEach((sugestao) => {
                storeSugestoes.put(sugestao);
            });

            // Atualizar a data da última sincronização
            const pedidoMeta = storeMeta.get('proprietario');

            pedidoMeta.onsuccess = () => {
                const proprietario = pedidoMeta.result;

                if (proprietario) {
                    proprietario.atualizadoEm = new Date().toISOString();
                    storeMeta.put(proprietario);
                }
            };

            transacao.oncomplete = () => resolve();
            transacao.onerror = () => reject(transacao.error);
            transacao.onabort = () => reject(transacao.error);
        });
    });
}

export function lerSugestoes(ordenacao = 'recentes') {
    return abrirBD().then((bd) => {
        return new Promise((resolve, reject) => {
            const transacao = bd.transaction(
                'sugestoes',
                'readonly'
            );

            const store = transacao.objectStore('sugestoes');

            const indice = ordenacao === 'estado'
                ? store.index('porEstado')
                : store.index('porData');

            const direcao = ordenacao === 'estado'
                ? 'next'
                : 'prev';

            const pedido = indice.openCursor(null, direcao);
            const resultados = [];

            pedido.onsuccess = () => {
                const cursor = pedido.result;

                if (cursor) {
                    resultados.push(cursor.value);
                    cursor.continue();
                }
            };

            pedido.onerror = () => reject(pedido.error);

            transacao.oncomplete = () => resolve(resultados);
            transacao.onerror = () => reject(transacao.error);
            transacao.onabort = () => reject(transacao.error);
        });
    });
}


export function acrescentarPendente(dados, utilizador) {
    return abrirBD().then((bd) => {
        return new Promise((resolve, reject) => {
            const transacao = bd.transaction('pendentes', 'readwrite');
            const store = transacao.objectStore('pendentes');

            const pedido = store.add({
                utilizador,
                titulo: dados.titulo,
                descricao: dados.descricao,
                categoria: dados.categoria,
                criadaEm: new Date().toISOString(),
                erro: null
            });

            let idLocal;

            pedido.onsuccess = () => {
                idLocal = pedido.result;
            };

            transacao.oncomplete = () => resolve(idLocal);
            transacao.onerror = () => reject(transacao.error);
            transacao.onabort = () => reject(transacao.error);
        });
    });
}


export async function lerPendentes() {
    const bd = await abrirBD();

    return new Promise((resolve, reject) => {
        const transacao = bd.transaction('pendentes', 'readonly');
        const pedido = transacao.objectStore('pendentes').getAll();

        let resultados = [];

        pedido.onsuccess = () => {
            resultados = pedido.result;
        };

        transacao.oncomplete = () => {
            resultados.sort((a, b) =>
                new Date(a.criadaEm) - new Date(b.criadaEm)
            );
            resolve(resultados);
        };

        transacao.onerror = () => reject(transacao.error);
        transacao.onabort = () => reject(transacao.error);
    });
}


export function marcarErro(idLocal, mensagem) {
    return abrirBD().then((bd) => {
        return new Promise((resolve, reject) => {
            const transacao = bd.transaction('pendentes', 'readwrite');
            const store = transacao.objectStore('pendentes');

            const pedido = store.get(idLocal);

            pedido.onsuccess = () => {
                const pendente = pedido.result;

                if (pendente) {
                    pendente.erro = mensagem;
                    store.put(pendente);
                }
            };

            transacao.oncomplete = () => resolve();
            transacao.onerror = () => reject(transacao.error);
            transacao.onabort = () => reject(transacao.error);
        });
    });
}


export function confirmarPendente(idLocal, sugestao) {
    return abrirBD().then((bd) => {
        return new Promise((resolve, reject) => {
            const transacao = bd.transaction(
                ['pendentes', 'sugestoes'],
                'readwrite'
            );

            const storePendentes = transacao.objectStore('pendentes');
            const storeSugestoes = transacao.objectStore('sugestoes');

            storePendentes.delete(idLocal);
            storeSugestoes.put(sugestao);

            transacao.oncomplete = () => resolve();
            transacao.onerror = () => reject(transacao.error);
            transacao.onabort = () => reject(transacao.error);
        });
    });
}

export async function lerProprietario() {
    const bd = await abrirBD();

    return new Promise((resolve, reject) => {
        const transacao = bd.transaction('meta', 'readonly');
        const pedido = transacao.objectStore('meta').get('proprietario');

        let proprietario = null;

        pedido.onsuccess = () => {
            proprietario = pedido.result || null;
        };

        transacao.oncomplete = () => resolve(proprietario);
        transacao.onerror = () => reject(transacao.error);
        transacao.onabort = () => reject(transacao.error);
    });
}

export function guardarProprietario(sessao) {
    return abrirBD().then((bd) => {
        return new Promise((resolve, reject) => {
            const transacao = bd.transaction('meta', 'readwrite');
            const store = transacao.objectStore('meta');

            store.put({
                chave: 'proprietario',
                utilizador: sessao.utilizador,
                nome: sessao.nome,
                papel: sessao.papel,
                expiracao: sessao.expiracao,
                atualizadoEm: new Date().toISOString()
            });

            transacao.oncomplete = () => resolve();
            transacao.onerror = () => reject(transacao.error);
            transacao.onabort = () => reject(transacao.error);
        });
    });
}

export function limparBD() {
    return abrirBD().then((bd) => {
        return new Promise((resolve, reject) => {
            const transacao = bd.transaction(
                ['sugestoes', 'pendentes', 'meta'],
                'readwrite'
            );

            transacao.objectStore('sugestoes').clear();
            transacao.objectStore('pendentes').clear();
            transacao.objectStore('meta').clear();

            transacao.oncomplete = () => resolve();
            transacao.onerror = () => reject(transacao.error);
            transacao.onabort = () => reject(transacao.error);
        });
    });
}
