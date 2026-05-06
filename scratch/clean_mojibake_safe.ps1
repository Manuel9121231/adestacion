$files = @(
    "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js",
    "c:\Users\holamundo\Documents\GitHub\adestacion\js\dashboard-ui.js",
    "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
)

foreach ($path in $files) {
    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        
        # Accents
        $content = $content.Replace(([char]195 + [char]161), "á")
        $content = $content.Replace(([char]195 + [char]169), "é")
        $content = $content.Replace(([char]195 + [char]173), "í")
        $content = $content.Replace(([char]195 + [char]179), "ó")
        $content = $content.Replace(([char]195 + [char]186), "ú")
        $content = $content.Replace(([char]195 + [char]177), "ñ")
        $content = $content.Replace(([char]195 + [char]154), "Ú")
        $content = $content.Replace(([char]194 + [char]183), "·")
        
        # Emojis (Mangled sequence -> Fixed character)
        
        # 📍 (Mangled as ðŸ“)
        $m_pin = [char]240 + [char]159 + [char]147
        $f_pin = [char]0xD83D + [char]0xDCCD
        $content = $content.Replace($m_pin, $f_pin)
        
        # 🚨 (Mangled as ðŸš¨)
        $m_alarm = [char]240 + [char]159 + [char]154 + [char]168
        $f_alarm = [char]0xD83D + [char]0xDEA8
        $content = $content.Replace($m_alarm, $f_alarm)
        
        # ✅ (Mangled as âœ…)
        $m_check = [char]226 + [char]156 + [char]133
        $f_check = [char]9989
        $content = $content.Replace($m_check, $f_check)
        
        # 🛠️ (Mangled as ðŸ”§)
        $m_tool = [char]240 + [char]159 + [char]148 + [char]167
        $f_tool = [char]0xD83D + [char]0xDEE0 + [char]0xFE0F
        $content = $content.Replace($m_tool, $f_tool)

        # ⚙️ (Mangled as âš™)
        $m_gear = [char]226 + [char]154 + [char]153
        $f_gear = [char]9881 + [char]65039
        $content = $content.Replace($m_gear, $f_gear)

        [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
    }
}
