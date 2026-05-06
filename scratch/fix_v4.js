const fs = require('fs');

const path = 'js/admin.js';
const buf = fs.readFileSync(path);

// The file is corrupted: UTF-8 emoji bytes were interpreted as CP1252/latin1
// and then saved as UTF-8 again

// Read the file as UTF-8 to get the corrupted text
let text = buf.toString('utf8');

// Try to fix by encoding as latin1 and decoding as UTF-8
// This reverses the double-encoding
try {
  // Create a Buffer from the UTF-8 bytes
  const tempBuf = Buffer.from(text, 'utf8');
  // Try to interpret as latin1 (this gives us the original corrupted bytes)
  // Then decode as UTF-8 
  const fixed = tempBuf.toString('latin1');
  // Actually, we need to go the other way - the original was UTF-8 emoji
  // that got read as CP1252/latin1, then saved as UTF-8
  
  // Let's try: decode the corrupted text as if it was CP1252 interpreted bytes
  // that should give us the original UTF-8 bytes
  const tempBuf2 = Buffer.from(text, 'binary');
  const fixed2 = tempBuf2.toString('utf8');
  
  if (fixed2 !== text && !fixed2.includes('ðŸ')) {
    console.log('Fixed via binary->UTF8 decode');
    fs.writeFileSync(path, fixed2, 'utf8');
    console.log('Saved fixed file');
  } else {
    console.log('Binary decode did not help, trying other methods...');
    
    // Manual replacements for common patterns
    const replacements = [
      // (corrupted, correct) - match the actual byte sequences
      [/ðŸ"¢/g, '📍'],
      [/ðŸ"§/g, '🔧'],
      [/ðŸ"‚/g, '📎'],
      [/ðŸ"¿/g, '🔥'],
      [/ðŸ"¡/g, '🔡'],
      [/ðŸ"¥/g, '🔥'],
      [/ðŸ"¬/g, '🔫'],
      [/ðŸ"Œ/g, '🔬'],
      [/ðŸ"/g, '🔏'],
      [/ðŸ¦/g, '🖼️'],
      [/ðŸ'·/g, '👤'],
      [/ðŸ"¢/g, '📍'],
    ];
    
    let fixed = text;
    for (const [pattern, replacement] of replacements) {
      const before = fixed;
      fixed = fixed.replace(pattern, replacement);
      if (before !== fixed) console.log('Replaced:', pattern, '->', replacement);
    }
    
    fs.writeFileSync(path, fixed, 'utf8');
    console.log('Applied manual replacements');
  }
} catch (e) {
  console.error('Error:', e);
}