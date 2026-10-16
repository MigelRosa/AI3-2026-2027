4.2
Usei allOf porque Sugestao combina todas as propriedades de SugestaoNova com propriedades adicionais do servidor. oneOf serviria para exigir que o objeto correspondesse a exatamente um dos schemas, não para os combinar.O required das propriedades novas fica no segundo subesquema de allOf, juntamente com as respetivas propriedades. Assim, os campos herdados continuam definidos em SugestaoNova, enquanto os novos campos são obrigatórios na resposta de Sugestao.

As propriedades id e estado são exigidas nas respostas através do required de Sugestao e estão marcadas como readOnly: true, pelo que não são exigidas nos pedidos que usam SugestaoNova.

4.3

O valor max-age=3600 permite manter as estatísticas em cache durante, no máximo, uma hora. Como os dados são recalculados de hora a hora, esta política é coerente com a frequência de atualização prevista, embora possa existir algum atraso até o cache expirar. O cabeçalho If-None-Match permite ao cliente enviar o ETag que já possui. Se corresponder à versão atual da sugestão, o servidor responde com 304 Not Modified, sem corpo, evitando transferir novamente a representação.


O cabeçalho If-None-Match permite ao cliente enviar o ETag que já possui. Se corresponder à versão atual da sugestão, o servidor responde com 304 Not Modified, sem corpo, evitando transferir novamente a representação.