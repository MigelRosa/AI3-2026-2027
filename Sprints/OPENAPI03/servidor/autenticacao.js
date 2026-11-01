import jwt from 'jsonwebtoken';
import { lerCookie } from './cookie.js';

const segredo = process.env.JWT_SEGREDO;

if (!segredo || segredo.length < 32) {
  throw new Error(
    'Configuração inválida: JWT_SEGREDO tem de existir e ter pelo menos 32 caracteres.'
  );
}

export function criarToken(utilizador, validade = Number(process.env.JWT_VALIDADE || 10)) {
  console.log('Validade JWT carregada:', validade);

  if (!Number.isInteger(validade) || validade < 1) {
    throw new Error('Configuração inválida: JWT_VALIDADE tem de ser um inteiro positivo.');
  }

  const token = jwt.sign(
    {
      nome: utilizador.nome,
      papel: utilizador.papel
    },
    segredo,
    {
      algorithm: 'HS256',
      subject: utilizador.utilizador,
      expiresIn: validade
    }
  );

  return { token, tipo: 'Bearer', expiraEm: validade };
}


export function exigirToken(req, res, next) {
  res.set('Cache-Control', 'no-store');

  const token = lerCookie(req, 'sessao');

  if (!token) {
    return res.status(401).json({
      codigo: 401,
      mensagem: 'É necessária autenticação.'
    });
  }

  try {
    const payload = jwt.verify(token, segredo, {
      algorithms: ['HS256']
    });

    req.utilizador = {
      sub: payload.sub,
      nome: payload.nome,
      papel: payload.papel,
      exp: payload.exp
    };

    return next();
  } catch {
    return res.status(401).json({
      codigo: 401,
      mensagem: 'Cookie de sessão inválido ou expirado.'
    });
  }
}
export function exigirPapel(papel) {
  return (req, res, next) => {
    if (req.utilizador?.papel !== papel) {
      res.set('Cache-Control', 'no-store');

      return res.status(403).json({
        codigo: 403,
        mensagem: 'Não tem permissão para executar esta operação.'
      });
    }

    return next();
  };
}
