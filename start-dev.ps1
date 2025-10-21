# PowerShell script to run npm run dev in both frontend and backend
$frontend = Join-Path $PSScriptRoot 'frontend'
$backend = Join-Path $PSScriptRoot 'backend'
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$frontend`"; npm run dev --host"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$backend`"; npm run dev --host"
