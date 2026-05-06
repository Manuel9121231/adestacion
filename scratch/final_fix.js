const fs = require('fs');

const replacements = [
    // Triply encoded or complex ones
    { from: /ÃƒÂº/g, to: 'ú' },
    { from: /ÃƒÂ¡/g, to: 'á' },
    { from: /ÃƒÂ©/g, to: 'é' },
    { from: /ÃƒÂ­/g, to: 'í' },
    { from: /ÃƒÂ³/g, to: 'ó' },
    { from: /ÃƒÂ±/g, to: 'ñ' },
    { from: /ÃƒÂ³/g, to: 'ó' },
    
    // Doubly encoded
    { from: /Ã¡/g, to: 'á' },
    { from: /Ã©/g, to: 'é' },
    { from: /Ã­/g, to: 'í' },
    { from: /Ã³/g, to: 'ó' },
    { from: /Ãº/g, to: 'ú' },
    { from: /Ã±/g, to: 'ñ' },
    { from: /Ã“/g, to: 'Ó' },
    { from: /Ãš/g, to: 'Ú' },
    { from: /Ã/g, to: 'Á' },
    { from: /Ã‰/g, to: 'É' },
    { from: /Ã/g, to: 'Í' },
    { from: /Ã‘/g, to: 'Ñ' },

    // Emojis and special icons (Admin.js specific patterns)
    { from: /Ã°Å¸â€ â€”/g, to: '🔗' },
    { from: /Ã¢Å¡Â Ã¯Â¸Â /g, to: '⚠️' },
    { from: /Ã°Å¸â€˜Â¤/g, to: '👤' },
    { from: /âœ…/g, to: '✅' },
    { from: /ðŸ“ /g, to: '📍' },
    { from: /ðŸš¨/g, to: '🚨' },
    { from: /ðŸ‘¤/g, to: '👤' },
    { from: /ðŸ“…/g, to: '📅' },
    { from: /Ã¢Å“â€¦/g, to: '✅' },
    { from: /Ã°Å¸Å¡Â¨/g, to: '🚨' },
    { from: /Ã°Å¸â€Â Ã¯Â¸Â /g, to: '🛠️' },
    { from: /Ã°Å¸Â Â­/g, to: '🏫' },
    { from: /Ã°Å¸Â¤â€“/g, to: '🤖' },
    { from: /Ã¢Å¡â„¢Ã¯Â¸Â /g, to: '⚙️' },
    { from: /Ã°Å¸Â â€”Ã¯Â¸Â /g, to: '🏗️' },
    { from: /Ã¢Â â€œ/g, to: '❓' },
    { from: /Ã¢Â Å’/g, to: '❌' },
    { from: /Ã¢Å“Â Ã¯Â¸Â /g, to: '📝' },
    { from: /Ã°Å¸â€”â€˜Ã¯Â¸Â /g, to: '🗑️' },
    { from: /Ã°Å¸â€Å/g, to: '📊' },
    { from: /Ã°Å¸â€â€¹/g, to: '📋' },
    { from: /Ã°Å¸â€±/g, to: '📱' },
    { from: /Ã°Å¸â€ Â«/g, to: '🔼' },
    { from: /Ã¢Å¾â€/g, to: '➕' },
    
    // Other common artifacts
    { from: /Ã¢â€ â‚¬/g, to: '──' },
    { from: /Ã‚Â·/g, to: '·' },
    { from: /Ã¢â‚¬â€œ/g, to: '–' },
    { from: /Ã¢â‚¬Â¦/g, to: '…' },
    { from: /Ã°Å¸â€ â€/g, to: '🔃' },
    { from: /Ã¢Å“â€/g, to: '✅' }
];

function fixFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    let original = content;
    
    for (const r of replacements) {
        content = content.replace(r.from, r.to);
    }
    
    if (content !== original) {
        fs.writeFileSync(path, content, 'utf8');
        console.log(`Fixed ${path}`);
    } else {
        console.log(`No changes needed for ${path}`);
    }
}

const files = [
    'js/admin.js',
    'js/checklist.js',
    'js/dashboard-ui.js',
    'app.js',
    'registro.html'
];

files.forEach(f => {
    if (fs.existsSync(f)) fixFile(f);
});
