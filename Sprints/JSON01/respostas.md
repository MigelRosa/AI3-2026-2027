No schema, as propriedades obrigatórias são indicadas através do array required, enquanto as propriedades opcionais são aquelas que não aparecem nesse array. Assim, pratica é opcional porque não foi incluída no required da disciplina.


4.4

| Alteração introduzida | Ficheiro | Sintaxe errada, inválido ou válido? | Mensagem obtida | O que a mensagem permitiu (ou não) concluir |
|---|---|---|---|---|
| Retirar a vírgula entre dois pares | `turma.json` | Sintaxe errada | `Expecting ',' delimiter` (ou mensagem semelhante) | O JSON está mal formado e não pode ser validado contra o schema. |
| Pôr texto onde é esperado um número | `turma.json` | Inválido | `must be integer` (ou mensagem semelhante) | A sintaxe está correta, mas o valor não respeita o tipo definido no schema. |
| Retirar uma propriedade obrigatória (`codigo`) | `turma.json` | Inválido | `must have required property 'codigo'` (ou mensagem semelhante) | O documento não contém uma propriedade obrigatória. |
| Trocar a ordem de duas propriedades | `turma.json` | Válido | Sem mensagem de erro | A ordem das propriedades num objeto JSON não altera a sua validade. |

4.5
| Construção | Onde a usou | O que ficou a ser exigido | O que continua a ser permitido |
|---|---|---|---|
| `type` / `properties` | `disciplinas.schema.json`, em `teorica` | `teorica` tem de ser um objeto com propriedades dos tipos definidos. | Os valores podem variar, desde que respeitem os tipos. |
| `required` | `turma.schema.json`, na raiz | `disciplina`, `codigo` e `data` têm de existir. | As restantes propriedades podem ser omitidas, desde que não sejam exigidas por dependências. |
| `items` + `minItems` / `maxItems` | `disciplinas.schema.json`, em `disciplina` | Tem de existir entre 1 e 10 disciplinas. | A lista pode ter qualquer quantidade dentro desse intervalo. |
| `pattern` | `turma.schema.json`, em `docenteTeorica` | O nome deve respeitar o padrão de nome e apelido iniciado por maiúsculas. | São permitidos diferentes nomes que respeitem o padrão e o comprimento definido. |
| `enum` | `turma.schema.json`, em `codigo` | O código tem de pertencer ao conjunto dos cinco códigos definidos. | Qualquer um dos cinco códigos é aceite. |
| `dependencies` | `turma.schema.json`, em `numeroInscritosTp1` | Se existir `numeroInscritosTp1`, tem de existir `docenteTp1`; o mesmo se aplica ao TP2. | Cada turno pode ser omitido por inteiro. |
| `oneOf` ou `anyOf` | `turma.schema.json`, em `planoAno1` | O array tem de corresponder a exatamente um dos dois conjuntos de disciplinas. | Pode conter disciplinas de um dos conjuntos, sem misturar os dois. 

4.5
### 14. Reflexão crítica

**1. Ao converter o XML em JSON, a distinção entre atributo e elemento desapareceu. Perdeu-se informação? Para quem é que isso importa?**

A informação principal manteve-se, mas perdeu-se a distinção entre atributos e elementos, porque no JSON tudo passa a ser representado por propriedades e valores. Isto pode ser importante para quem precisa de trabalhar com o XML original ou com programas que dependem dessa estrutura.

**2. O XML Schema da ficha anterior impunha a ordem dos elementos; o JSON Schema não. Isso é uma fraqueza ou uma vantagem para quem escreve o programa leitor?**

Acho que é uma vantagem, porque o programa pode ler as propriedades independentemente da ordem em que aparecem. Assim, o código fica mais simples e menos dependente da forma como o documento foi escrito.

**3. O `totalAlunos` é um número entre 16 e 24. Que combinações absurdas de valores o seu schema continua a aceitar? O que faria falta para as impedir?**

O schema pode aceitar, por exemplo, um total de 20 alunos, mas apenas 2 inscritos no TP1 e 30 no TP2. Os valores cumprem os limites definidos, mas não fazem sentido em conjunto. Para impedir estas situações, seria necessário criar regras que relacionassem os valores, como garantir que a soma dos inscritos não ultrapassa o total de alunos.

**4. Um documento é válido hoje. Amanhã acrescenta-se ao `required` uma propriedade nova. O que acontece a todos os documentos já existentes? Que escolha teria evitado o problema?**

Os documentos que não tiverem essa nova propriedade deixam de ser válidos. Para evitar este problema, podia definir-se um valor por defeito no programa leitor ou tornar a propriedade opcional, pelo menos durante uma fase de transição.

**5. Compare o custo de validar com o custo de não validar: que erros passam a ser detetados no momento certo, e que trabalho é que isso