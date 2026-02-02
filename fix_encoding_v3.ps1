$path = "c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js"
# Use UTF8 with BOM to ensure Windows/Browser detects it correctly if it was confused before
$utf8 = [System.Text.Encoding]::UTF8 

# Read file
$content = Get-Content $path -Raw

# Define special chars safely
$o_acute = [char]0x00F3
$e_acute = [char]0x00E9
$a_acute = [char]0x00E1
$i_inverted = [char]0x00A1
$q_inverted = [char]0x00BF
# Bell emoji is tricky in PS if encoding is weird, let's substitute with checkmark or just "ALERTA" to be safe? 
# User wants "bell". 
# UTF-16 for Bell U+1F514 is \uD83D\uDD14
$bell = [char]0xD83D + [char]0xDD14 
# Or just use the string if the shell supports it. Let's try explicit string but if it fails, fallback to simple char.
# To be super safe, I'll use a simple unicode char that works everywhere like 🔔 provided I can trust the script content.
# Since I am using write_to_file (UTF-8), and PS reads it, it *should* work. 
# But let's rely on the char casting for the latin1 stuff which definitely failed.

# 1. Fix Notification Toast
# Regex to match: showToast(`?? ${
$content = $content -replace 'showToast\(`.. \$\{', "showToast(`${bell} `${"

# Fix "Marca nuevo pedido" text
$content = $content -replace '\?Nuevo Pedido!', "${i_inverted}Nuevo Pedido!"

# Fix "?? ${count} Nuevos Pedidos" 
$content = $content -replace '`\?`\$\{newOrdersCount\}', "`"${i_inverted}`${newOrdersCount}"

# 2. Fix Search Placeholder
# Matches: placeholder="Qu. est.s buscando hoy?" (Dot matches the broken char)
$content = $content -replace 'placeholder="Qu.*est.*s buscando hoy\?"', "placeholder=`"${q_inverted}Qu${e_acute} est${a_acute}s buscando hoy?`""

# 3. Fix 'Gestión de Pedidos' Header
# Matches: Gesti.n de Pedidos or Gestiï¿½n
$content = $content -replace "Gesti.*n de Pedidos", "Gesti${o_acute}n de Pedidos"

# 4. Save with UTF-8 BOM
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Output "Encoding fix v3 applied."
