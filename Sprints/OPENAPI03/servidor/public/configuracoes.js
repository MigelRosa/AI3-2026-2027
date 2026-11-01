const CONFIGURACOES_POR_OMISSAO = {
  tema: 'claro',
  ordenacao: 'recentes'
};

export function lerConfiguracoes() {
  const dados = localStorage.getItem('configuracoes');

  if (!dados) {
    return { ...CONFIGURACOES_POR_OMISSAO };
  }

  try {
    const configuracoes = JSON.parse(dados);

    const temaValido = ['claro', 'escuro'].includes(configuracoes.tema);
    const ordenacaoValida = ['recentes', 'estado'].includes(configuracoes.ordenacao);

    if (!temaValido || !ordenacaoValida) {
      return { ...CONFIGURACOES_POR_OMISSAO };
    }

    return configuracoes;
  } catch {
    return { ...CONFIGURACOES_POR_OMISSAO };
  }
}

export function guardarConfiguracoes(configuracoes) {
  localStorage.setItem('configuracoes', JSON.stringify(configuracoes));
}