const fs = require('fs');

const path = 'js/admin.js';
const content = fs.readFileSync(path, 'utf8');

// Common mojibake replacements
const replacements = {
  'ðŸ"': '📍',
  'ðŸ"§': '🔧',
  'ðŸ"‚': '📎',
  'ðŸ"¿': '🔥',
  'ðŸ"¡': '🔡',
  'ðŸ"¥': '🔥',
  'ðŸ"¬': '🔫',
  'ðŸ"' : '🔧',
  'ðŸ"Œ': '🔬',
  'ðŸ"': '🔏',
  'ðŸ"'¡': '🔡',
  'ðŸ"¢': '🔢',
  'ðŸ"¤': '🔤',
  'ðŸ"¥': '🔥',
  'ðŸ¦': '🖼️',
  'ðŸ‘·': '👤',
  'ðŸ"': '📍',
  'ðŸ"¡': '🔡',
  'ðŸ"¢': '🔢',
  'ðŸ"¤': '🔤',
  'ðŸ"¥': '🔥',
  '�': '',
  'Â·': '·',
};

let fixed = content;

// Fix double-encoded UTF-8 (CP1252 interpreted as UTF-8)
for (let i = 0; i < 5; i++) {
  try {
    fixed = fixed.replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã±/g, 'ñ');
    fixed = fixed.replace(/Ã/g, 'Á').replace(/Ã‰/g, 'É').replace(/Ã/g, 'Í').replace(/Ã“/g, 'Ó').replace(/Ãš/g, 'Ú').replace(/Ã‘/g, 'Ñ');
    fixed = fixed.replace(/Ã¼/g, 'ü').replace(/Ã¤/g, 'ä').replace(/Ã¶/g, 'ö').replace(/ÃŸ/g, 'ÿ');
    fixed = fixed.replace(/Â·/g, '·').replace(/Â¡/g, '¡').replace(/Â¿/g, '¿');
  } catch(e) {}
}

// Fix emoji mojibake patterns
const emojiFixes = {
  'ðŸ"': '📍',
  'ðŸ"§': '🔧',
  'ðŸ"‚': '📎',
  'ðŸ"¿': '🔥',
  'ðŸ"¡': '🔡',
  'ðŸ"¥': '🔥',
  'ðŸ"¬': '🔫',
  'ðŸ"': '🔧',
  'ðŸ"Œ': '🔬',
  'ðŸ"': '🔏',
  'ðŸ¦': '🖼️',
  'ðŸ‘·': '👤',
};

for (const [bad, good] of Object.entries(emojiFixes)) {
  fixed = fixed.split(bad).join(good);
}

// Try to fix using encode/decode cycle
try {
  // Standard mojibake fix
  fixed = fixed.replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã±/g, 'ñ');
} catch(e) {}

fs.writeFileSync(path, fixed, 'utf8');
console.log('Fixed!');