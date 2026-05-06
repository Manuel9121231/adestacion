$path = "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Regex to find double-encoded UTF8 (Ã followed by something)
# This is a bit risky but let's try common ones
$text = $text -replace "ÃƒÂ¡", "á"
$text = $text -replace "ÃƒÂ©", "é"
$text = $text -replace "ÃƒÂ­", "í"
$text = $text -replace "ÃƒÂ³", "ó"
$text = $text -replace "ÃƒÂº", "ú"
$text = $text -replace "ÃƒÂ±", "ñ"
$text = $text -replace "Ã‚Â·", "·"
$text = $text -replace "Ãƒï¿½", "Ú"

# Restore emojis from their mangled double-encoded versions
# I'll just use the ones I saw in the screenshot/view_file
$text = $text -replace "ðŸ“", "📍"
$text = $text -replace "âœ…", "✅"
$text = $text -replace "ðŸš¨", "🚨"
$text = $text -replace "âš™", "⚙️"
$text = $text -replace "âœ ", "✏️"
$text = $text -replace "ðŸ—‘", "🗑️"

[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
