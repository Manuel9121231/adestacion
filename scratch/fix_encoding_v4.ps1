function Fix-Encoding($path) {
    Write-Host "Processing $path"
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    # If the text looks like it was already double-encoded (mojibake)
    # We can try to decode the "mangled" characters back to bytes and then to UTF8
    # However, if some characters were lost or merged, this is hard.
    
    # Let's try a simpler approach: Regex replacement for known mangled patterns
    $replacements = @{
        'Ãš' = 'Ú';
        'Ã¡' = 'á';
        'Ã©' = 'é';
        'Ã­' = 'í';
        'Ã³' = 'ó';
        'Ãº' = 'ú';
        'Ã±' = 'ñ';
        'Ã' = 'í'; # Sometimes í is mangled to just Ã or followed by something else
        'âœ…' = '✅';
        'ðŸ“' = '📍';
        'ðŸš¨' = '🚨';
        'ðŸ”§' = '🛠️';
        'ðŸ‘·' = '👷';
        'ðŸ—“ï¸' = '📅';
        'âš™ï¸' = '⚙️';
        'âœ ï¸' = '✏️';
        'ðŸ—‘ï¸' = '🗑️';
        'ðŸ ­' = '🏠';
        'ðŸ¤–' = '🤖';
        'ðŸ —ï¸' = '🏗️';
        'â “' = '❓';
        'âš ï¸' = '⚠️';
        'ðŸ‘‹' = '👋';
        'ðŸ¨ï¸' = '🖨️';
        'ðŸ–¨' = '🖨️';
        'Ã³n' = 'ón';
        'mÃ¡q' = 'máq';
        'Ã¡' = 'á';
        'Â·' = '·';
    }

    foreach ($k in $replacements.Keys) {
        $text = $text.Replace($k, $replacements[$k])
    }

    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

Fix-Encoding "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
Fix-Encoding "c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js"
Fix-Encoding "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
Fix-Encoding "c:\Users\holamundo\Documents\GitHub\adestacion\css\main.css"
