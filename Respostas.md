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