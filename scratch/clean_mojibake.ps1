$files = @(
    "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js",
    "c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js",
    "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
)

foreach ($path in $files) {
    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        $content = $content.Replace(([char]195 + [char]161), "á")
        $content = $content.Replace(([char]195 + [char]169), "é")
        $content = $content.Replace(([char]195 + [char]173), "í")
        $content = $content.Replace(([char]195 + [char]179), "ó")
        $content = $content.Replace(([char]195 + [char]186), "ú")
        $content = $content.Replace(([char]195 + [char]177), "ñ")
        $content = $content.Replace(([char]195 + [char]154), "Ú")
        $content = $content.Replace(([char]194 + [char]183), "·")
        $content = $content.Replace("Ã³n", "ón")
        $content = $content.Replace("Ã¡", "á")
        
        # Fixing emojis that might still be mangled
        # ðŸ“ (📍) = 240, 159, 147
        $content = $content.Replace(([char]240 + [char]159 + [char]147), "📍")
        # âœ… (✅) = 226, 156, 133
        $content = $content.Replace(([char]226 + [char]156 + [char]133), "✅")
        # ðŸš¨ (🚨) = 240, 159, 154, 168
        $content = $content.Replace(([char]240 + [char]159 + [char]154 + [char]168), "🚨")

        [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
    }
}
