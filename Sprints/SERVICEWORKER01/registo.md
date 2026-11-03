| Recurso | Cache-Control | Depende de cookie? | Estratégia do Service Worker | IndexedDB? |
|---|---|---|---|---|
| Ficheiros da interface | — | Não | Cache First | Não |
| GET /v2/categorias | public, max-age=86400 | Não | Stale While Revalidate | Não |
| POST /v2/sessao | — | Não | Network Only | Não |
| GET /v2/sessao | — | Sim | Network Only | Não |
| DELETE /v2/sessao | — | Sim | Network Only | Não |
| GET /v2/sugestoes | no-store | Sim | Network Only | Sim |
| POST /v2/sugestoes | no-store | Sim | Network Only | Sim |

4.6
25
| **Dado** | **Mecanismo usado** | **Quem escreve (servidor, página ou service worker)** | **Quando é apagado** | **Porque não se usou outro mecanismo** |
|---|---|---|---|---|
| Token | Cookie `HttpOnly` | Servidor | Quando termina a sessão, expira ou é invalidado | Evita que o JavaScript tenha acesso direto ao token, aumentando a segurança. |
| Configurações | `localStorage` | Página | Quando o utilizador limpa os dados do navegador ou a aplicação as elimina | Permite guardar preferências entre sessões e depois de fechar o navegador. |
| Rascunho | `sessionStorage` | Página | Quando o separador é fechado ou quando a aplicação o elimina após submissão ou logout bem-sucedido | É adequado para dados temporários, sem os manter permanentemente. |
| Ficheiros da interface | Cache API (`interface-v1`) | Service Worker | Quando uma nova versão substitui a cache antiga ou quando os dados do site são limpos | Permite carregar a interface sem ligação à Internet. |
| Categorias | Cache API (`dados-publicos`) | Service Worker | Quando a cache é limpa ou substituída | Permite reutilizar dados públicos offline e atualizá-los em segundo plano. |
| Lista de sugestões | IndexedDB (`sugestoes`) | Página | Quando outro utilizador inicia sessão, quando termina sessão com sucesso ou quando a aplicação limpa a base de dados | Permite guardar e consultar dados estruturados localmente, mesmo sem ligação. |
| Sugestões pendentes | IndexedDB (`pendentes`) | Página | Quando são enviadas com sucesso, descartadas ou quando a base de dados é limpa | Permite guardar sugestões temporariamente até existir ligação para as enviar ao servidor. |

4.7
26. Reflexão
1. Sem ligação, que operação de autenticação continua impossível e porquê?

Sem ligação à Internet, não é possível iniciar sessão, porque o servidor tem de validar as credenciais do utilizador e criar a sessão, através do cookie de autenticação. A aplicação consegue apresentar dados guardados localmente, mas não consegue confirmar novas credenciais sem comunicar com o servidor.

2. Se a ligação caísse depois de o servidor criar a sugestão, mas antes de chegar a resposta, o que aconteceria? Que alteração evitaria o problema e que versão teria a API?

A aplicação iria considerar que o pedido falhou e guardaria a sugestão como pendente no IndexedDB. Quando a ligação regressasse, tentaria enviá-la novamente. No entanto, como o servidor já tinha criado a primeira sugestão, poderia acabar por existir uma duplicação.

Para evitar este problema, poderia ser adicionada uma chave de idempotência (Idempotency-Key) ao pedido. O servidor guardaria essa chave e reconheceria pedidos repetidos, devolvendo o resultado original sem criar outra sugestão.

Sendo uma alteração compatível com a versão anterior do contrato, a API passaria da versão 2.1.0 para 2.2.0.

3. Que problema resolveria a Background Sync API? Porque é que o cookie continuaria a ser uma limitação?

A Background Sync API permitiria enviar automaticamente as sugestões pendentes mesmo quando a página estivesse fechada, desde que o navegador suportasse essa funcionalidade e as condições necessárias estivessem reunidas.

O cookie continuaria a ser uma limitação porque é necessário para autenticar os pedidos. Sendo HttpOnly, não pode ser consultado ou gerido diretamente pelo JavaScript do Service Worker. O navegador pode enviar automaticamente o cookie válido em pedidos apropriados, mas, se a sessão tiver expirado ou o cookie tiver sido removido, o envio não poderá ser autenticado.

4. Num computador partilhado, que risco representa a cópia local da Ana na IndexedDB? Que regras reduzem o risco e o que continua por resolver?

O risco é que outra pessoa que utilize o mesmo computador e navegador possa ter acesso aos dados privados da Ana, mesmo depois de a sessão expirar.

As regras da ficha reduzem esse risco através da verificação do proprietário da base de dados, da validade da sessão, da eliminação dos dados quando outro utilizador inicia sessão e da limpeza do IndexedDB quando a sessão é terminada com sucesso.

No entanto, os dados continuam guardados localmente enquanto não forem eliminados. Por isso, alguém com acesso ao mesmo perfil do navegador ou às ferramentas de programador poderá conseguir consultar esses dados.

5. Se a Ana mudar de computador, leva consigo as configurações? E as pendentes? Compare com a resposta dada na API03.

Não. As configurações estão guardadas no localStorage e as sugestões pendentes no IndexedDB. Ambos são mecanismos de armazenamento local do navegador e do computador onde foram utilizados.

Na API03, as configurações também estavam guardadas no localStorage, pelo que não acompanhavam a Ana quando mudava de computador. Na SERVICEWORKER01, as sugestões pendentes ficam guardadas no IndexedDB, mas continuam igualmente limitadas ao computador e navegador de origem.

Para que estas informações acompanhassem a Ana entre computadores, seria necessário guardá-las no servidor, associadas à sua conta, e carregá-las após iniciar sessão.