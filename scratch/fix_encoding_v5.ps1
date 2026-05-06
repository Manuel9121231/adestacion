function Repair-Mojibake($path) {
    Write-Host "Repairing $path"
    # Read bytes as they are
    $bytes = [System.IO.File]::ReadAllBytes($path)
    
    # Try to decode as windows-1252 (ANSI) and then encode as UTF-8
    # This works if the file was incorrectly saved as ANSI while containing UTF-8 bytes
    $ansi = [System.Text.Encoding]::GetEncoding(1252)
    $text = $ansi.GetString($bytes)
    
    # If the text now contains the correct characters, save it as UTF8
    # We can check for common markers like 'á' (Ã¡ in mangled)
    if ($text -match "[áéíóúñ✅📍🚨]") {
        [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "Success for $path"
    } else {
        Write-Host "No obvious mojibake found for $path, skipping automatic conversion."
    }
}

# Repair-Mojibake "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
# The above might be risky if I don't know the exact previous encoding.

# I'll stick to the manual replacements but I'll use the HEX codes to avoid PS parsing issues.
$map = @(
    @{ Pattern = [char]0xC3 + [char]0xA1; Replace = "á" },
    @{ Pattern = [char]0xC3 + [char]0xA9; Replace = "é" },
    @{ Pattern = [char]0xC3 + [char]0xAD; Replace = "í" },
    @{ Pattern = [char]0xC3 + [char]0xB3; Replace = "ó" },
    @{ Pattern = [char]0xC3 + [char]0xBA; Replace = "ú" },
    @{ Pattern = [char]0xC3 + [char]0xB1; Replace = "ñ" },
    @{ Pattern = [char]0xC3 + [char]0x9A; Replace = "Ú" },
    @{ Pattern = "ðŸ“"; Replace = "📍" },
    @{ Pattern = "ðŸš¨"; Replace = "🚨" },
    @{ Pattern = "âœ…"; Replace = "✅" },
    @{ Pattern = "ðŸ‘·"; Replace = "👷" },
    @{ Pattern = "ðŸ—“ï¸"; Replace = "📅" },
    @{ Pattern = "âš™ï¸"; Replace = "⚙️" },
    @{ Pattern = "âœ ï¸"; Replace = "✏️" },
    @{ Pattern = "ðŸ—‘ï¸"; Replace = "🗑️" }
)

function Manual-Fix($path) {
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    foreach ($item in $map) {
        $content = $content.Replace($item.Pattern, $item.Replace)
    }
    [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

Manual-Fix "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
Manual-Fix "c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js"
Manual-Fix "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
