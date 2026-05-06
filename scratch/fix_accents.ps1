$path = "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$c = $c.Replace(([char]195+[char]161), [char]225) # á
$c = $c.Replace(([char]195+[char]169), [char]233) # é
$c = $c.Replace(([char]195+[char]173), [char]237) # í
$c = $c.Replace(([char]195+[char]179), [char]243) # ó
$c = $c.Replace(([char]195+[char]186), [char]250) # ú
$c = $c.Replace(([char]195+[char]177), [char]241) # ñ
$c = $c.Replace(([char]195+[char]154), [char]218) # Ú
$c = $c.Replace(([char]194+[char]183), [char]183) # ·
# Fixing double-encoded versions too
$c = $c.Replace("ÃƒÂ¡", [char]225)
$c = $c.Replace("ÃƒÂ©", [char]233)
$c = $c.Replace("ÃƒÂ­", [char]237)
$c = $c.Replace("ÃƒÂ³", [char]243)
$c = $c.Replace("ÃƒÂº", [char]250)
$c = $c.Replace("ÃƒÂ±", [char]241)

[System.IO.File]::WriteAllText($path, $c, (New-Object System.Text.UTF8Encoding($false)))
