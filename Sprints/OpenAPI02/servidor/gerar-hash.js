import bcrypt from 'bcryptjs';

const palavraPasse = process.argv[2];

if (!palavraPasse) {
  console.error('Erro: indica uma palavra-passe como argumento.');
  console.error('Utilização: node gerar-hash.js "XSAZnNU3ixvK3JfeLuYdjmjHmIBp2fqRFPaQK9FX9BHASWb_s5FCSfXniVczOFDy"');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(palavraPasse, 10);
  console.log(hash);
} catch {
  console.error('Erro ao gerar o hash da palavra-passe.');
  process.exit(1);
}
