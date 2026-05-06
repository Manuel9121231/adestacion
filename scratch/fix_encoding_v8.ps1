function Fix-Mangled($path) {
    Write-Host "Fixing $path"
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    
    # Define replacements using character codes to avoid encoding issues in the script itself
    $reps = @(
        @{ M = ([char]240 + [char]159 + [char]147); F = "📍" }, # ðŸ“ 
        @{ M = ([char]240 + [char]159 + [char]154 + [char]168); F = "🚨" }, # ðŸš¨
        @{ M = ([char]226 + [char]156 + [char]133); F = "✅" }, # âœ…
        @{ M = ([char]195 + [char]154 + "ltimo"); F = "Último" }, # Ãšltimo
        @{ M = ("m" + [char]195 + [char]161 + "quina"); F = "máquina" }, # mÃ¡quina
        @{ M = ([char]195 + [char]161); F = "á" }, # Ã¡
        @{ M = ([char]195 + [char]169); F = "é" }, # Ã©
        @{ M = ([char]195 + [char]173); F = "í" }, # Ã­
        @{ M = ([char]195 + [char]179); F = "ó" }, # Ã³
        @{ M = ([char]195 + [char]186); F = "ú" }, # Ãº
        @{ M = ([char]195 + [char]177); F = "ñ" }, # Ã±
        @{ M = ([char]194 + [char]183); F = "·" }, # Â·
        @{ M = ([char]240 + [char]15 + [char]141); F = "🏠" }, # ðŸ ­
        @{ M = ([char]240 + [char]15 + [char]164 + [char]150); F = "🤖" }, # ðŸ¤–
        @{ M = ([char]226 + [char]154 + [char]153 + [char]239 + [char]184 + [char]143); F = "⚙️" }, # âš™ï¸ 
        @{ M = ([char]240 + [char]15 + [char]151 + [char]151 + [char]239 + [char]184 + [char]143); F = "🏗️" } # ðŸ —ï¸ 
    )

    foreach ($r in $reps) {
        $content = $content.Replace($r.M, $r.F)
    }

    [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

Fix-Mangled "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
Fix-Mangled "c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js"
Fix-Mangled "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
