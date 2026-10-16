| Nó | Tipo | Pai | Irmãos | Justificação |
|---|---|---|---|---|
| fatura | raiz | — | — | É a raiz do documento e não tem pai nem irmãos. |
| cabecalho | intermédio | fatura | produtos | Ambos pertencem à fatura. |
| data | terminal | cabecalho | cliente | Ambos são filhos de cabecalho. |
| id | atributo | fatura | — | Os atributos não são irmãos dos elementos filhos. |
| 2026-10-16 | texto | data | — | É o conteúdo textual do elemento data. |


4.4 · Reflexão crítica

1. Escolhi elementos para dados que podem ter mais informação e atributos para dados simples. O telefone ficou como elemento porque pode ter informações adicionais, como o tipo de contacto.

2. O código do produto poderia ser um atributo, pois serve para o identificar. A morada é mais adequada como elemento, porque pode ser dividida em rua, código postal e localidade.

3. Prefiro que o total seja calculado pelo serviço Web, usando os preços e as quantidades, para evitar erros. No entanto, também pode estar no ficheiro para ser consultado mais facilmente.

4. A estrutura permite uma fatura sem produtos ou com dois clientes. O XML, por si só, não impede estas situações.

5. Se as estruturas forem diferentes, o programa pode não conseguir encontrar os dados corretamente. Por isso, é importante combinar uma estrutura comum.


Tarefa 2

4.1
O atributo ProductID foi declarado com use="required", tornando-o obrigatório, enquanto Category, sem essa indicação, é opcional por omissão.


4.4

1. Um schema resolve o problema das hierarquias diferentes?

Sim, porque define uma estrutura comum. Deve ser criado antes dos documentos serem produzidos, por quem define as regras dos dados.

2. Que valores absurdos o schema aceita para Price?

Aceita valores como -100 ou 0. Para impedir isso, seriam necessárias restrições adicionais aos valores.

3. O que acontece se for acrescentado um elemento obrigatório?

Os documentos antigos sem esse elemento deixam de ser válidos. Se fosse opcional, usando minOccurs="0", isso não aconteceria.

4. Qual é a vantagem de validar?

Permite encontrar erros antes de os dados serem usados pelo programa, evitando problemas e trabalho extra na correção.

5. Que documentos precisam de mixed="true"?

Documentos com texto livre e elementos misturados, como uma notícia que inclua nomes de pessoas e datas no meio dos parágrafos
