# Create Redis directory
$redisPath = "E:\Desktop\Clicklink\redis"
New-Item -ItemType Directory -Force -Path $redisPath

# Download portable Redis
$url = "https://raw.githubusercontent.com/microsoftarchive/redis/win-3.0.504/bin/release/redis-server.exe"
$output = "$redisPath\redis-server.exe"
Invoke-WebRequest -Uri $url -OutFile $output

# Create Redis configuration file
$redisConfig = @"
port 6379
maxmemory 100mb
maxmemory-policy allkeys-lru
"@
$redisConfig | Out-File "$redisPath\redis.conf" -Encoding UTF8

Write-Host "Redis files downloaded to $redisPath"
Write-Host "Starting Redis server..."

# Start Redis server
Start-Process -FilePath "$redisPath\redis-server.exe" -ArgumentList "$redisPath\redis.conf" -WindowStyle Hidden

Write-Host "Redis server started on port 6379"
Write-Host ""
Write-Host "To start Redis server manually, run:"
Write-Host "$redisPath\redis-server.exe $redisPath\redis.conf"