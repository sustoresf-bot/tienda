$content = Get-Content 'c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js'
$newContent = @()
for ($i = 0; $i -lt $content.Length; $i++) {
    $lineNum = $i + 1
    if ($lineNum -lt 8773 -or $lineNum -gt 9801) {
        $newContent += $content[$i]
    }
}
$newContent | Set-Content 'c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js'
