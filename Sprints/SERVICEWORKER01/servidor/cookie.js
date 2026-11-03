export function lerCookie(req, nome) {
  const cabecalho = req.get('Cookie');

  if (!cabecalho) return undefined;

  for (const parte of cabecalho.split(';')) {
    const [chave, ...valor] = parte.trim().split('=');

    if (chave === nome) return decodeURIComponent(valor.join('='));
  }

  return undefined;
}
