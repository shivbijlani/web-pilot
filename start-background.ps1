# Start web-pilot in background using the built-in --background flag

Write-Host "🚀 Starting web-pilot in background..." -ForegroundColor Cyan

# Stop any existing processes
Stop-Process -Name msedge -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start with --background flag (process detaches itself)
node src/cli.js --background

Write-Host "⏳ Waiting for web-pilot to fully start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if process is running
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "`n✅ Web-pilot is running!" -ForegroundColor Green
    Write-Host "   Node processes: $($nodeProcesses.Count)" -ForegroundColor Cyan
    foreach ($proc in $nodeProcesses) {
        Write-Host "   PID: $($proc.Id)" -ForegroundColor Cyan
    }
    Write-Host "`nℹ️  To stop: .\stop-background.ps1" -ForegroundColor Gray
    Write-Host "ℹ️  To check: Get-Process -Name node`n" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Process not found. Check for errors above." -ForegroundColor Red
}
