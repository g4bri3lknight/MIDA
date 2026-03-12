const fs = require('fs');
const path = require('path');

// Percorsi
const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
const staticDir = path.join(__dirname, '..', '.next', 'static');
const publicDir = path.join(__dirname, '..', 'public');
const prismaDir = path.join(__dirname, '..', 'prisma');
const dbFile = path.join(__dirname, '..', 'db', 'custom.db');
const nodeModulesDir = path.join(__dirname, '..', 'node_modules');
const setupProdBat = path.join(__dirname, '..', 'setup-prod.bat');

console.log('Copiatura file per build standalone...\n');

// Funzione per copiare cartella ricorsivamente
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // 1. Copia .next/static
  console.log('Copia .next/static...');
  const targetStaticDir = path.join(standaloneDir, '.next', 'static');
  if (fs.existsSync(staticDir)) {
    copyDir(staticDir, targetStaticDir);
    console.log('  ✓ Completato');
  }

  // 2. Copia public
  console.log('Copia public...');
  const targetPublicDir = path.join(standaloneDir, 'public');
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, targetPublicDir);
    console.log('  ✓ Completato');
  }

  // 3. Copia prisma
  console.log('Copia prisma...');
  const targetPrismaDir = path.join(standaloneDir, 'prisma');
  if (fs.existsSync(prismaDir)) {
    copyDir(prismaDir, targetPrismaDir);
    console.log('  ✓ Completato');
  }

  // 4. Copia database nella cartella principale standalone
  console.log('Copia database...');
  const targetDbFile = path.join(standaloneDir, 'custom.db');
  
  if (fs.existsSync(dbFile)) {
    fs.copyFileSync(dbFile, targetDbFile);
    console.log('  ✓ Database copiato');
  } else {
    console.log('  ! Database non trovato');
  }

  // 5. Copia Prisma
  console.log('Copia Prisma...');
  const targetNodeModules = path.join(standaloneDir, 'node_modules');
  
  if (!fs.existsSync(targetNodeModules)) {
    fs.mkdirSync(targetNodeModules, { recursive: true });
  }

  // Copia @prisma/client
  const prismaClientSrc = path.join(nodeModulesDir, '@prisma', 'client');
  const prismaClientDest = path.join(targetNodeModules, '@prisma', 'client');
  if (fs.existsSync(prismaClientSrc)) {
    copyDir(prismaClientSrc, prismaClientDest);
    console.log('  ✓ @prisma/client');
  }

  // Copia .prisma
  const dotPrismaSrc = path.join(nodeModulesDir, '.prisma');
  const dotPrismaDest = path.join(targetNodeModules, '.prisma');
  if (fs.existsSync(dotPrismaSrc)) {
    copyDir(dotPrismaSrc, dotPrismaDest);
    console.log('  ✓ .prisma');
  }

  // Copia @prisma/engines
  const prismaEnginesSrc = path.join(nodeModulesDir, '@prisma', 'engines');
  const prismaEnginesDest = path.join(targetNodeModules, '@prisma', 'engines');
  if (fs.existsSync(prismaEnginesSrc)) {
    copyDir(prismaEnginesSrc, prismaEnginesDest);
    console.log('  ✓ @prisma/engines');
  }

  // Copia prisma CLI
  const prismaCliSrc = path.join(nodeModulesDir, 'prisma');
  const prismaCliDest = path.join(targetNodeModules, 'prisma');
  if (fs.existsSync(prismaCliSrc)) {
    copyDir(prismaCliSrc, prismaCliDest);
    console.log('  ✓ prisma CLI');
  }

  // 6. Copia setup-prod.bat
  console.log('Copia script di setup...');
  if (fs.existsSync(setupProdBat)) {
    fs.copyFileSync(setupProdBat, path.join(standaloneDir, 'setup-prod.bat'));
    console.log('  ✓ setup-prod.bat');
  }

  // 7. Crea .env
  console.log('Creazione .env...');
  const envContent = 'DATABASE_URL=file:custom.db\n';
  fs.writeFileSync(path.join(standaloneDir, '.env'), envContent);
  console.log('  ✓ Completato');

  console.log('\n✅ Copiatura completata!\n');
  console.log('========================================');
  console.log('  ISTRUZIONI PER IL DEPLOY');
  console.log('========================================\n');
  console.log('1. Copia .next/standalone nella destinazione');
  console.log('2. Esegui setup-prod.bat per rigenerare Prisma');
  console.log('3. Modifica .env con il percorso corretto');
  console.log('4. Avvia: set NODE_ENV=production && node server.js\n');
} catch (error) {
  console.error('\n❌ Errore:', error.message);
  process.exit(1);
}
