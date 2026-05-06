$path = "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Re-write renderIncidencias and verDetalleSesion with CLEAN strings
# I'll use a regex to find the functions and replace them or just replace the mangled sequences

$replacements = @{
    'âœ…' = '✅';
    'ðŸ“ ' = '📍';
    'ðŸš¨' = '🚨';
    'ðŸ”§' = '🛠️';
    'ðŸ‘·' = '👷';
    'ðŸ—“ï¸ ' = '📅';
    'ðŸ“' = '📍';
    'ðŸ‘‹' = '👋';
    'ðŸŽ¯' = '🎯';
    'âš ï¸ ' = '⚠️';
    'ðŸ’¬' = '💬';
}

foreach ($k in $replacements.Keys) {
    $content = $content.Replace($k, $replacements[$k])
}

[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
