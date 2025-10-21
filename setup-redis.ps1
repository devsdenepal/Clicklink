# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run this script as Administrator. Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Red
    Exit 1
}

# Check if Chocolatey is installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
} else {
    Write-Host "Chocolatey is already installed." -ForegroundColor Green
}

# Install Redis
Write-Host "Installing Redis..." -ForegroundColor Yellow
choco install redis-64 -y
refreshenv

# Create Redis Windows Service
Write-Host "Setting up Redis Windows Service..." -ForegroundColor Yellow
redis-server --service-install
redis-server --service-start

# Test Redis connection
Write-Host "Testing Redis connection..." -ForegroundColor Yellow
$testResult = redis-cli ping
if ($testResult -eq "PONG") {
    Write-Host "Redis is running successfully!" -ForegroundColor Green
} else {
    Write-Host "Redis might not be running properly. Please check the error messages above." -ForegroundColor Red
}

Write-Host "`nRedis Installation Complete!" -ForegroundColor Green
Write-Host "`nUseful Redis Commands:" -ForegroundColor Cyan
Write-Host "- Start Redis Service:    redis-server --service-start" -ForegroundColor White
Write-Host "- Stop Redis Service:     redis-server --service-stop" -ForegroundColor White
Write-Host "- Uninstall Redis:       redis-server --service-uninstall" -ForegroundColor White
Write-Host "- Test Redis:            redis-cli ping" -ForegroundColor White
Write-Host "- Monitor Redis:         redis-cli monitor" -ForegroundColor White
Write-Host "- Redis CLI:             redis-cli" -ForegroundColor White

Write-Host "`nTo use Redis in your application:" -ForegroundColor Cyan
Write-Host "1. Make sure REDIS_URL is set in your .env file:" -ForegroundColor White
Write-Host "   REDIS_URL=redis://localhost:6379" -ForegroundColor Gray
Write-Host "2. Restart your Node.js application" -ForegroundColor White

# Check if Redis service is running
$service = Get-Service -Name Redis -ErrorAction SilentlyContinue
if ($service.Status -eq 'Running') {
    Write-Host "`nRedis service is running on port 6379" -ForegroundColor Green
} else {
    Write-Host "`nWarning: Redis service is not running" -ForegroundColor Red
}