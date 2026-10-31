import jwt from 'jsonwebtoken';

const segredo = process.env.JWT_SEGREDO;

if (!segredo || segredo.length < 32) {
  throw new Error(
    'Configuração inválida: JWT_SEGREDO tem de existir e ter pelo menos 32 caracteres.'
  );
}

export function criarToken(utilizador) {
  const validade = Number(process.env.JWT_VALIDADE || 10);
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

  const authorization = req.get('Authorization');

  if (!authorization || !/^Bearer \S+$/i.test(authorization)) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({
      codigo: 401,
      mensagem: 'É necessária autenticação.'
    });
  }

  const token = authorization.split(' ')[1];

  try {
    const payload = jwt.verify(token, segredo, {
      algorithms: ['HS256']
    });

    req.utilizador = {
      sub: payload.sub,
      nome: payload.nome,
      papel: payload.papel
    };

    return next();
  } catch {
    res.set('WWW-Authenticate', 'Bearer error="invalid_token"');

    return res.status(401).json({
      codigo: 401,
      mensagem: 'Token JWT inválido ou expirado.'
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
