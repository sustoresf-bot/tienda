$path = "c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Read file (try to detect encoding or assume it's messy)
$content = Get-Content $path -Raw

# 1. Fix Notification Toast (Replace '??' or similar garbage with Bell)
# We assume the code logic from Step 212 is structurally there, just text broke.
$content = $content -replace "showToast\(`.. \${", "showToast(`🔔 ${"
$content = $content -replace "\?Nuevo Pedido!", "¡Nuevo Pedido!"
$content = $content -replace "`\?`\${newOrdersCount} Nuevos Pedidos!`", "`¡${newOrdersCount} Nuevos Pedidos!`"

# 2. Fix Search Placeholder
$content = $content -replace "placeholder=`"Qu. est.s buscando hoy\?`"", "placeholder=`"¿Qué estás buscando hoy?`""

# 3. Fix 'Gestión de Pedidos' Header
$content = $content -replace "Gesti.n de Pedidos", "Gestión de Pedidos"
$content = $content -replace "Gesti\?n de Pedidos", "Gestión de Pedidos"

# 4. Save with UTF-8 No BOM
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
Write-Output "Encoding fix applied."
