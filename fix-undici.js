// Script pour corriger le problème undici avec Node.js 18
const fs = require('fs');
const path = require('path');

console.log('🔧 Correction du problème undici pour Node.js 18...');

// Chemin vers le fichier problématique
const undiciPath = path.join(__dirname, 'node_modules', 'undici', 'lib', 'web', 'webidl', 'index.js');

if (fs.existsSync(undiciPath)) {
    console.log('📁 Fichier undici trouvé:', undiciPath);
    
    // Lire le contenu
    let content = fs.readFileSync(undiciPath, 'utf8');
    
    // Remplacer la ligne problématique
    const problematicLine = 'webidl.is.File = webidl.util.MakeTypeAssertion(File)';
    const fixedLine = 'webidl.is.File = webidl.util.MakeTypeAssertion(globalThis.File || class File {})';
    
    if (content.includes(problematicLine)) {
        content = content.replace(problematicLine, fixedLine);
        fs.writeFileSync(undiciPath, content, 'utf8');
        console.log('✅ Fichier undici corrigé avec succès!');
    } else {
        console.log('⚠️  Ligne problématique non trouvée, le fichier a peut-être déjà été corrigé');
    }
} else {
    console.log('❌ Fichier undici non trouvé');
}

console.log('🎯 Correction terminée');