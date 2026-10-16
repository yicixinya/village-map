# Local static file server for the village map
# Run: right-click -> Run with PowerShell

$port = 8000
$root = $PSScriptRoot

$ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" -and $_.PrefixOrigin -eq "Dhcp" } |
    Select-Object -ExpandProperty IPAddress
if (-not $ips) {
    $ips = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } |
        Select-Object -ExpandProperty IPAddress
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Village Map - Local Server Started" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Open on phone (same WiFi) with browser:" -ForegroundColor Cyan
Write-Host ""
foreach ($ip in $ips) {
    Write-Host "   http://${ip}:${port}" -ForegroundColor White
}
$firstIp = $ips | Select-Object -First 1
if ($firstIp) {
    [System.IO.File]::WriteAllText("$PSScriptRoot\ip.txt", "http://${firstIp}:${port}", [System.Text.Encoding]::UTF8)
}
Write-Host ""
Write-Host "On this PC: http://localhost:${port}" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()

while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    $writer = New-Object System.IO.StreamWriter($stream)
    $writer.BaseStream.WriteTimeout = 30000

    try {
        $requestLine = $reader.ReadLine()
        if (-not $requestLine) { continue }

        $parts = $requestLine -split " "
        if ($parts.Length -lt 2) { continue }
        $urlPath = $parts[1]
        $urlPath = [System.Uri]::UnescapeDataString($urlPath)
        $q = $urlPath.IndexOf("?")
        if ($q -ge 0) { $urlPath = $urlPath.Substring(0, $q) }

        if ($urlPath -eq "/" -or $urlPath -eq "") { $urlPath = "/index.html" }
        $urlPath = $urlPath -replace "\.\.", ""
        $urlPath = $urlPath -replace "//", "/"

        $filePath = $root + ($urlPath -replace "/", "\")
        while ($filePath.Contains("\\")) { $filePath = $filePath -replace "\\\\", "\" }

        while ($reader.ReadLine()) { }

        if (Test-Path -LiteralPath $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            switch ($ext) {
                ".html" { $contentType = "text/html; charset=utf-8" }
                ".js"   { $contentType = "application/javascript; charset=utf-8" }
                ".css"  { $contentType = "text/css; charset=utf-8" }
                ".json" { $contentType = "application/json; charset=utf-8" }
                ".jpg"  { $contentType = "image/jpeg" }
                ".jpeg" { $contentType = "image/jpeg" }
                ".png"  { $contentType = "image/png" }
                ".gif"  { $contentType = "image/gif" }
                ".svg"  { $contentType = "image/svg+xml" }
                ".ico"  { $contentType = "image/x-icon" }
                ".woff" { $contentType = "font/woff" }
                ".woff2" { $contentType = "font/woff2" }
                ".txt"  { $contentType = "text/plain; charset=utf-8" }
            }

            $header = "HTTP/1.1 200 OK`r`nContent-Type: ${contentType}`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
            $hb = [System.Text.Encoding]::UTF8.GetBytes($header)
            $writer.BaseStream.Write($hb, 0, $hb.Length)
            $writer.BaseStream.Write($bytes, 0, $bytes.Length)
            $writer.BaseStream.Flush()
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 200  $urlPath  ($([math]::Round($bytes.Length/1KB))KB)" -ForegroundColor Green
        } else {
            $body = "404 Not Found: $urlPath"
            $bb = [System.Text.Encoding]::UTF8.GetBytes($body)
            $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bb.Length)`r`nConnection: close`r`n`r`n"
            $hb = [System.Text.Encoding]::UTF8.GetBytes($header)
            $writer.BaseStream.Write($hb, 0, $hb.Length)
            $writer.BaseStream.Write($bb, 0, $bb.Length)
            $writer.BaseStream.Flush()
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 404  $urlPath" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        try { $writer.Close() } catch {}
        try { $reader.Close() } catch {}
        try { $client.Close() } catch {}
    }
}

$listener.Stop()
