import express from 'express';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { criarToken, exigirToken, exigirPapel } from './autenticacao.js';

const app = express();
const PORTA = 3000;

const diretorio = path.dirname(fileURLToPath(import.meta.url));
const utilizadoresPath = path.join(diretorio, 'dados', 'utilizadores.json');
const sugestoesPath = path.join(diretorio, 'dados', 'sugestoes.json');
const publicPath = path.join(diretorio, 'public');
let sugestoesEmMemoria;

const hashInexistente = '$2b$10$sZWNuJoe1Fqw.zPZBPqJJOvuagxJ3eOVMhvHYZe8Cs3jY.59Jp0ce';

app.use(express.json());
app.use(express.static(publicPath));
const categorias = [
  { codigo: 'instalacoes', descricao: 'Instalações' },
  { codigo: 'ensino', descricao: 'Ensino' },
  { codigo: 'servicos', descricao: 'Serviços' },
  { codigo: 'atividades', descricao: 'Atividades' },
  { codigo: 'outra', descricao: 'Outra' }
];

app.get('/v2/categorias', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');

  return res.status(200).json(categorias);
});
async function lerJSON(caminho) {
  return JSON.parse(await readFile(caminho, 'utf8'));
}
async function obterSugestoes() {
  if (!sugestoesEmMemoria) {
    sugestoesEmMemoria = await lerJSON(sugestoesPath);
  }

  return sugestoesEmMemoria;
}

function erro(res, codigo, mensagem, detalhes) {
  const corpo = { codigo, mensagem };

  if (detalhes) corpo.detalhes = detalhes;

  res.set('Cache-Control', 'no-store');
  return res.status(codigo).json(corpo);
}

// Valida as credenciais do corpo do pedido. Devolve o utilizador autenticado
// ou envia a resposta de erro (400/401) e devolve undefined.
async function autenticar(req, res) {
  const corpo = req.body;
  const detalhes = [];

  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    erro(res, 400, 'O corpo do pedido é inválido.', [
      { campo: 'corpo', problema: 'Deve ser um objeto JSON.' }
    ]);
    return undefined;
  }

  if (
    typeof corpo.utilizador !== 'string' ||
    !/^([0-9]{5,8}|[a-z]+\.[a-z]+)$/.test(corpo.utilizador)
  ) {
    detalhes.push({
      campo: 'utilizador',
      problema: 'Deve ser um número de aluno ou um nome no formato nome.apelido.'
    });
  }

  if (
    typeof corpo.palavraPasse !== 'string' ||
    corpo.palavraPasse.length < 8 ||
    corpo.palavraPasse.length > 128
  ) {
    detalhes.push({
      campo: 'palavraPasse',
      problema: 'Deve ter entre 8 e 128 caracteres.'
    });
  }

  if (detalhes.length > 0) {
    erro(res, 400, 'Os dados enviados são inválidos.', detalhes);
    return undefined;
  }

  const utilizadores = await lerJSON(utilizadoresPath);
  const utilizador = utilizadores.find(
    (u) => u.utilizador === corpo.utilizador
  );

  const hash = utilizador?.hashPalavraPasse ?? hashInexistente;
  const palavraPasseCorreta = await bcrypt.compare(corpo.palavraPasse, hash);

  if (!utilizador || !palavraPasseCorreta) {
    erro(res, 401, 'Credenciais inválidas.');
    return undefined;
  }

  return utilizador;
}

app.post('/v2/tokens', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');

  try {
    const utilizador = await autenticar(req, res);

    if (!utilizador) return undefined;

    const resultadoToken = criarToken(utilizador);

    console.log('Resposta criada:', resultadoToken.expiraEm);
    console.log('JWT_VALIDADE no servidor:', process.env.JWT_VALIDADE);
    return res.status(200).json(resultadoToken);
  } catch (err) {
    return next(err);
  }
});

const VALIDADE_SESSAO = 900;
const opcoesCookie = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/v2'
};

app.post('/v2/sessao', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');

  try {
    const utilizador = await autenticar(req, res);

    if (!utilizador) return undefined;

    const { token } = criarToken(utilizador, VALIDADE_SESSAO);

    res.cookie('sessao', token, {
      ...opcoesCookie,
      maxAge: VALIDADE_SESSAO * 1000
    });

    return res.status(200).json({
      utilizador: utilizador.utilizador,
      nome: utilizador.nome,
      papel: utilizador.papel,
      expiracao: new Date(Date.now() + VALIDADE_SESSAO * 1000).toISOString()
    });
  } catch (err) {
    return next(err);
  }
});

app.get('/v2/sessao', exigirToken, (req, res) => {
  return res.status(200).json({
    utilizador: req.utilizador.sub,
    nome: req.utilizador.nome,
    papel: req.utilizador.papel,
    expiracao: new Date(req.utilizador.exp * 1000).toISOString()
  });
});

app.delete('/v2/sessao', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.clearCookie('sessao', opcoesCookie);
  return res.status(204).end();
});

app.post(
  '/v2/sugestoes',
  exigirToken,
  exigirPapel('aluno'),
  async (req, res, next) => {
    try {
      const { titulo, descricao, categoria } = req.body;

      if (
        typeof titulo !== 'string' || !titulo.trim() ||
        typeof descricao !== 'string' || !descricao.trim() ||
        typeof categoria !== 'string' || !categoria.trim()
      ) {
        return erro(res, 400, 'Os dados da sugestão são inválidos.');
      }

      const sugestoes = await obterSugestoes();

      const novaSugestao = {
        id: Math.max(0, ...sugestoes.map((s) => s.id)) + 1,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria: categoria.trim(),
        numeroAluno: req.utilizador.sub,
        estado: 'pendente'
      };

      sugestoes.push(novaSugestao);

      return res.status(201).json(novaSugestao);
    } catch (err) {
      return next(err);
    }
  }
);


app.get('/v2/sugestoes', exigirToken, async (req, res, next) => {
  try {
    const sugestoes = await obterSugestoes();

    const itens = req.utilizador.papel === 'servicos'
      ? sugestoes
      : sugestoes.filter((s) => s.numeroAluno === req.utilizador.sub);

    res.set('Cache-Control', 'private, no-cache');

    return res.status(200).json({
      pagina: 1,
      tamanhoPagina: 20,
      total: itens.length,
      itens
    });
  } catch (err) {
    return next(err);
  }
});

app.get('/v2/openapi.yaml', async (req, res, next) => {
  try {
    const contratoPath = path.resolve(diretorio, '..', 'sugestoes.openapi.yaml');
    const contrato = await readFile(contratoPath, 'utf8');

    res.type('text/yaml; charset=utf-8');
    return res.send(contrato);
  } catch (err) {
    return next(err);
  }
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return erro(res, 400, 'O corpo do pedido contém JSON inválido.');
  }

  return erro(res, 500, 'Ocorreu um erro interno no servidor.');
});

app.listen(PORTA, () => {
  console.log(`Servidor disponível em http://localhost:${PORTA}`);
});
