const fs = require('fs');

const buf = fs.readFileSync('js/admin.js.bak');

// The file contains UTF-8 emoji bytes that were incorrectly interpreted as CP1252/latin1
// and then re-encoded as UTF-8. We need to reverse this.

// Original emojis and their corrupted forms:
// 📍 = f09f948d -> corrupted becomes c3b0c5b8e2809cc28d (the bytes interpreted as CP1252)
// 🔧 = f09f94a7
// 👤 = f09f91a4
// 🔬 = f09f94ac
// 🔒 = f09f9492
// 🖼️ = f09f96bc

// Map of corrupted byte sequences to correct emojis
const emojiFixes = [
  // 📍 (location pin)
  ['c3b0c5b8e2809cc28d', '📍'],
  // 🔧 (wrench) - f09f94a7 -> corrupted
  ['c3b0c5b8e2809cc2a7', '🔧'],
  // 👤 (bust in silhouette) - f09f91a4 -> corrupted
  ['c3b0c5b8e28093c2a4', '👤'],
  // 🔬 (microscope) - f09f94ac
  ['c3b0c5b8e2809cc2ac', '🔬'],
  // 🔒 (locked with pen) - f09f9492
  ['c3b0c5b8e2809cc292', '🔒'],
  // 🖼️ (frame with picture) - f09f96bc
  ['c3b0c5b8e2809bc2bc', '🖼️'],
];

let text = buf.toString('utf8');

// First fix the emoji patterns
for (const [corrupted, correct] of emojiFixes) {
  const corruptedBuf = Buffer.from(corrupted, 'hex');
  const corruptedText = corruptedBuf.toString('binary');
  if (text.includes(corruptedText)) {
    text = text.split(corruptedText).join(correct);
    console.log('Fixed:', corruptedText, '->', correct);
  } else {
    // Try finding by looking at the actual text
    const idx = text.indexOf('ðŸ');
    if (idx >= 0) {
      console.log('Found corrupted at', idx, ':', JSON.stringify(text.substring(idx, idx+10)));
    }
  }
}

// Fix CP1252->UTF-8 mojibake
const latinFixes = [
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã±', 'ñ'],
  ['Â·', '·'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
];

latinFixes.forEach(([pattern, replacement]) => {
  if (text.includes(pattern)) {
    text = text.split(pattern).join(replacement);
  }
});

fs.writeFileSync('js/admin.js', text, 'utf8');
console.log('Saved');