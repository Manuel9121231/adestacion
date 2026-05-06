function Fix-Mojibake {
    param([string]$text)
    $current = $text
    while ($true) {
        try {
            $bytes = [System.Text.Encoding]::GetEncoding("Windows-1252").GetBytes($current)
            $candidate = [System.Text.Encoding]::UTF8.GetString($bytes)
            if ($candidate -eq $current) { break }
            
            # Check if it's actually valid UTF-8 and looks "better"
            # Simple heuristic: if it fails to round-trip back or produces invalid chars, stop.
            # But usually, GetString/GetBytes on these encodings won't throw unless it's really bad.
            $current = $candidate
        } catch {
            break
        }
    }
    return $current
}

$files = @(
    "js/admin.js",
    "js/checklist.js",
    "js/dashboard-ui.js",
    "app.js",
    "registro.html",
    "dashboard.html",
    "index.html"
)

foreach ($f in $files) {
    $path = Join-Path (Get-Location) $f
    if (Test-Path $path) {
        Write-Host "Processing $f..."
        # Force UTF8 reading
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        $fixed = Fix-Mojibake $content
        if ($fixed -ne $content) {
            Write-Host "  Fixed mojibake in $f"
            [System.IO.File]::WriteAllText($path, $fixed, [System.Text.Encoding]::UTF8)
        } else {
            Write-Host "  No mojibake found in $f"
        }
    } else {
        Write-Host "File not found: $f"
    }
}
