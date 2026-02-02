$path = "c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js"
$utf8 = [System.Text.Encoding]::UTF8

# Read file as raw string
$content = [System.IO.File]::ReadAllText($path, $utf8)

# --- 1. CRITICAL CODE LOGIC REPAIR ---
# Variable name corruption: 'paÃƒÂ­ssword' -> 'password'
$content = $content -replace "paÃƒÂ­ssword", "password"
$content = $content -replace "paÃ¯Â¿Â½ssword", "password" # Coverage for other corruption

# --- 2. NOTIFICATIONS & SOUND ---
# 'Ã°Å¸â€ â€' -> Bell Emoji
$content = $content -replace "Ã°Å¸â€ â€", "🔔"
$content = $content -replace "Ã‚Â¡", "¡"
# Fix 'Nuevo Pedido' variations
$content = $content -replace "\?Nuevo Pedido!", "¡Nuevo Pedido!"

# --- 3. UI TEXT REPAIR (Context Aware) ---
# Common corrupted words
$content = $content -replace "GestiÃ¯Â¿Â½n", "Gestión"
$content = $content -replace "Gesti.n", "Gestión"
$content = $content -replace "InicializaciÃ¯Â¿Â½n", "Inicialización"
$content = $content -replace "AutenticaciÃ¯Â¿Â½n", "Autenticación"
$content = $content -replace "ValidaciÃ¯Â¿Â½n", "Validación"
$content = $content -replace "SelecciÃ¯Â¿Â½n", "Selección"
$content = $content -replace "ConfirmaciÃ¯Â¿Â½n", "Confirmación"
$content = $content -replace "informaciÃ¯Â¿Â½n", "información"
$content = $content -replace "mÃ¯Â¿Â½todo", "método"
$content = $content -replace "telÃ¯Â¿Â½fono", "teléfono"
$content = $content -replace "contraseÃ¯Â¿Â½a", "contraseña"
$content = $content -replace "ContraseÃ¯Â¿Â½a", "Contraseña"
$content = $content -replace "mÃ¯Â¿Â½s", "más"
$content = $content -replace "mÃ¯Â¿Â½nimo", "mínimo"
$content = $content -replace "automÃ¯Â¿Â½tico", "automático"
$content = $content -replace "envÃ¯Â¿Â½o", "envío"
$content = $content -replace "estÃ¯Â¿Â½", "está"
$content = $content -replace "Ã¯Â¿Â½xito", "éxito"
$content = $content -replace "paÃ¯Â¿Â½s", "país"
$content = $content -replace "dÃ¯Â¿Â½gitos", "dígitos"
$content = $content -replace "utilizaciÃ¯Â¿Â½n", "utilización"
$content = $content -replace "cancelaciÃ¯Â¿Â½n", "cancelación"
$content = $content -replace "direcciÃ¯Â¿Â½n", "dirección"
$content = $content -replace "precisiÃ¯Â¿Â½n", "precisión"
$content = $content -replace "migraciÃ¯Â¿Â½n", "migración"
$content = $content -replace "invÃ¯Â¿Â½lido", "inválido"
$content = $content -replace "OcurriÃ¯Â¿Â½", "Ocurrió"
$content = $content -replace "registraÃ¯Â¿Â½", "registró" # Guessing context? 'registrar'
$content = $content -replace "aquÃ¯Â¿Â½", "aquí"
$content = $content -replace "pÃ¯Â¿Â½gina", "página"
$content = $content -replace "tambiem", "también" # spell check

# --- 4. SPECIFIC USER REQUESTS ---
# Search Placeholder
$content = $content -replace 'placeholder="Qu. est.s buscando hoy\?"', 'placeholder="¿Qué estás buscando hoy?"'
# Subscription Features (Clean remaining ???)
$content = $content -replace "✅ Carga VIP", "✅ Carga VIP" # Ensure it stays correct
$content = $content -replace "\?+ Carga VIP", "✅ Carga VIP"
$content = $content -replace "\?+ Mantenimiento", "✅ Mantenimiento"
$content = $content -replace "\?+ Omnicanalidad", "✅ Omnicanalidad"
$content = $content -replace "\?+ 3 MESES", "🎁 ¡3 MESES"

# --- 5. CLEANUP ---
# Replace remaining 'Ã¯Â¿Â½' with nothing or '?' to avoid crashing if in critical spots?
# Better to leave identifying marks than break code logic by deleting chars.
# But for UI text, maybe replace with 'ó' as a statistical guess if we missed some? No, too risky.

# Save
[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Output "Repair script completed."
