function Fix-Mangled($path) {
    Write-Host "Fixing $path"
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    
    # Define mangled sequences and their fixes
    # We use byte arrays to be 100% sure about the sequences
    $fixes = @(
        @{ Mangled = "Ãš"; Fixed = "Ú" },
        @{ Mangled = "Ã¡"; Fixed = "á" },
        @{ Mangled = "Ã©"; Fixed = "é" },
        @{ Mangled = "Ã­"; Fixed = "í" },
        @{ Mangled = "Ã³"; Fixed = "ó" },
        @{ Mangled = "Ãº"; Fixed = "ú" },
        @{ Mangled = "Ã±"; Fixed = "ñ" },
        @{ Mangled = "Â·"; Fixed = "·" },
        @{ Mangled = "âš™ï¸"; Fixed = "⚙️" },
        @{ Mangled = "âœ ï¸"; Fixed = "✏️" },
        @{ Mangled = "ðŸ—‘ï¸"; Fixed = "🗑️" },
        @{ Mangled = "âœ…"; Fixed = "✅" },
        @{ Mangled = "ðŸš¨"; Fixed = "🚨" },
        @{ Mangled = "ðŸ“"; Fixed = "📍" },
        @{ Mangled = "ðŸ‘·"; Fixed = "👷" },
        @{ Mangled = "ðŸ—“ï¸"; Fixed = "📅" },
        @{ Mangled = "ðŸ ­"; Fixed = "🏠" },
        @{ Mangled = "ðŸ¤–"; Fixed = "🤖" },
        @{ Mangled = "ðŸ —ï¸"; Fixed = "🏗️" },
        @{ Mangled = "â “"; Fixed = "❓" },
        @{ Mangled = "âš ï¸"; Fixed = "⚠️" }
    )

    foreach ($f in $fixes) {
        $content = $content.Replace($f.Mangled, $f.Fixed)
    }

    [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

Fix-Mangled "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
Fix-Mangled "c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js"
Fix-Mangled "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
