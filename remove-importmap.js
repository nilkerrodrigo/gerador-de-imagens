import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para ES Modules no Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, 'index.html');

console.log("🛡️  Aether Security Protocol: Verificando integridade do index.html...");

try {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Regex para encontrar e destruir o bloco importmap
  const regex = /<script type="importmap">[\s\S]*?<\/script>/g;

  if (regex.test(content)) {
    console.log('🚨 ALERTA: Importmap detectado! Executando remoção forçada...');
    content = content.replace(regex, '');
    fs.writeFileSync(indexPath, content);
    console.log('✅ SUCESSO: Importmap removido. O arquivo está limpo para produção.');
  } else {
    console.log('✅ VERIFICADO: Nenhum importmap encontrado. Prosseguindo com o build.');
  }
} catch (err) {
  console.error('❌ ERRO FATAL ao processar index.html:', err);
  process.exit(1);
}
