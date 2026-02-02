$path = 'c:\Users\Admin\Desktop\Tienda\CLIENTES\Sustore\script.js'
$content = [IO.File]::ReadAllText($path)
$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($path, $content, $utf8NoBOM)
