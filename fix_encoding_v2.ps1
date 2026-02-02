$path = "c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Read file
$content = Get-Content $path -Raw

# 1. Fix Notification Toast
# Regex to match: showToast(`?? ${  (where ?? is any 2 chars)
# We use single quotes to prevent PowerShell variable expansion
$content = $content -replace 'showToast\(`.. \$\{', 'showToast(`🔔 ${'

# Fix "Marca nuevo pedido" text
$content = $content -replace '\?Nuevo Pedido!', '¡Nuevo Pedido!'

# Fix "?? ${count} Nuevos Pedidos" 
# Regex matches: `?`${newOrdersCount}
$content = $content -replace '`\?`\$\{newOrdersCount\}', '`¡${newOrdersCount}'

# 2. Fix Search Placeholder
# Matches: placeholder="Qu. est.s buscando hoy?"
$content = $content -replace 'placeholder="Qu. est.s buscando hoy\?"', 'placeholder="¿Qué estás buscando hoy?"'

# 3. Fix 'Gestión de Pedidos' Header
# Matches: Gesti.n de Pedidos
$content = $content -replace 'Gesti.n de Pedidos', 'Gestión de Pedidos'
# Fallback if it's Gesti?n
$content = $content -replace 'Gesti\?n de Pedidos', 'Gestión de Pedidos'

# 4. Save with UTF-8 No BOM
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
Write-Output "Encoding fix v2 applied."
