| **Dado** | **Mecanismo usado** | **Quanto tempo dura** | **Porque não se usou outro mecanismo** |
|---|---|---|---|
| Token | Cookie `sessao` com `HttpOnly` | 15 minutos (900 segundos) | Não se usou `localStorage` porque o token ficaria acessível através de JavaScript, aumentando o risco em caso de ataques XSS. |
| Configurações | `localStorage` | Até serem apagadas manualmente ou os dados do site serem eliminados | Não se usou `sessionStorage` porque as configurações devem permanecer guardadas mesmo depois de fechar o browser. |
| Rascunho | `sessionStorage` | Enquanto o separador estiver aberto, incluindo após recarregar a página | Não se usou `localStorage` porque o rascunho não precisa de permanecer guardado depois de fechar o separador ou o browser. |

19. Reflexão
1. Que vantagem tem o cookie em relação à variável usada na API02? E que desvantagem?

A principal vantagem do cookie é que é enviado automaticamente pelo browser nos pedidos ao servidor, permitindo manter a sessão mesmo depois de recarregar a página. Além disso, pode ter a propriedade HttpOnly, que impede o acesso ao token através de JavaScript.

A desvantagem é que os cookies exigem cuidados adicionais de segurança, como a proteção contra ataques CSRF, e têm de ser configurados corretamente.

2. Em T8, o servidor aceitou o cookie depois de terminada a sessão? Porquê?

Sim, o servidor aceitou o cookie enquanto este ainda era válido, porque o logout apenas apaga o cookie no browser, não invalida imediatamente o token JWT no servidor. Assim, alguém que tenha copiado o valor do cookie antes do logout ainda o pode utilizar até expirar.

3. Se a Ana mudar de computador, as suas configurações acompanham-na? O que seria necessário para que isso acontecesse?

Não. As configurações estão guardadas no localStorage do browser e do computador onde foram definidas. Para acompanharem a Ana noutro computador, seria necessário guardar as configurações numa base de dados associadas à sua conta de utilizador e carregá-las depois de iniciar sessão.