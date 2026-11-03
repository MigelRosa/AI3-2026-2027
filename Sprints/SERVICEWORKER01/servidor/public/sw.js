const CACHE_INTERFACE = 'interface-v1';
const CACHE_DADOS = 'dados-publicos';

const FICHEIROS_INTERFACE = [
    '/',
    '/index.html',
    '/estilos.css',
    '/app.js',
    '/configuracoes.js',
    '/bd.js',
    '/api.js',
    '/pendentes.js'
];

// Instalação
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_INTERFACE)
            .then((cache) => cache.addAll(FICHEIROS_INTERFACE))
    );
});

// Ativação
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((nomesCaches) => {
            return Promise.all(
                nomesCaches
                    .filter((nome) =>
                        nome !== CACHE_INTERFACE &&
                        nome !== CACHE_DADOS
                    )
                    .map((nome) => caches.delete(nome))
            );
        }).then(() => self.clients.claim())
    );
});



self.addEventListener('fetch', (event) => {
    const pedido = event.request;
    const url = new URL(pedido.url);

    if (pedido.method !== 'GET') {
        return;
    }

    // GET /v2/categorias
    if (
        url.origin === self.location.origin &&
        url.pathname === '/v2/categorias'
    ) {
        event.respondWith(
            caches.open(CACHE_DADOS).then(async (cache) => {
                const respostaCache = await cache.match(pedido);

                const atualizar = fetch(pedido).then(async (respostaRede) => {
                    if (respostaRede.ok) {
                        await cache.put(pedido, respostaRede.clone());
                    }

                    return respostaRede;
                });

                if (respostaCache) {
                    event.waitUntil(atualizar.catch(() => {}));
                    return respostaCache;
                }

                return atualizar;
            })
        );

        return;
    }

    // Ficheiros da interface: Cache First
    if (
        url.origin === self.location.origin &&
        (
            url.pathname === '/' ||
            url.pathname.endsWith('.html') ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.js')
        )
    ) {
        event.respondWith(
            caches.open(CACHE_INTERFACE).then(async (cache) => {
                const respostaCache = await cache.match(pedido);

                if (respostaCache) {
                    return respostaCache;
                }

                const respostaRede = await fetch(pedido);

                if (respostaRede.ok) {
                    await cache.put(pedido, respostaRede.clone());
                }

                return respostaRede;
            })
        );
    }
});
 
self.addEventListener('message', (event) => {
    if (event.data && event.data.tipo === 'ativar') {
        self.skipWaiting();
    }
});


