function Fix-File-Bytes($path) {
    Write-Host "Fixing $path"
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $hex = [System.BitConverter]::ToString($bytes) -replace '-'
    
    # We want to replace sequences of bytes that represent mojibake
    # Example: UTF8 bytes of 📍 are F0 9F 93 8D
    # If the file contains these bytes but is treated as ANSI, they look like ðŸ“
    
    # Actually, if the file contains the correct bytes, we just need to re-save it with the correct encoding header or without BOM.
    # But if the file contains the bytes of the literal STRING "ðŸ“", then it's different.
    
    # Let's try to decode the file as UTF-8. If it's already UTF-8, GetString will work.
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    # Common mojibake replacements in text
    $replacements = @{
        "ðŸ“" = "📍";
        "ðŸš¨" = "🚨";
        "âœ…" = "✅";
        "Ãšltimo" = "Último";
        "mÃ¡quina" = "máquina";
        "Ã¡" = "á";
        "Ã©" = "é";
        "Ã­" = "í";
        "Ã³" = "ó";
        "Ãº" = "ú";
        "Ã±" = "ñ";
        "âš™" = "⚙️";
        "âœ " = "✏️";
        "ðŸ—‘" = "🗑️";
        "Â·" = "·";
    }

    foreach ($key in $replacements.Keys) {
        $text = $text.Replace($key, $replacements[$key])
    }
    
    # Save as UTF-8 NO BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
}

Fix-File-Bytes "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
Fix-File-Bytes "c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js"
Fix-File-Bytes "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
