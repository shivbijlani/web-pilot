# Stop web-pilot background process and cleanup

Write-Host "🛑 Stopping web-pilot..." -ForegroundColor Cyan

# Kill processes
Write-Host "   Stopping Edge browser..." -ForegroundColor Yellow
Stop-Process -Name msedge -Force -ErrorAction SilentlyContinue

Write-Host "   Stopping Node processes..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

# Verify cleanup
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
$edgeProcesses = Get-Process -Name msedge -ErrorAction SilentlyContinue

if (-not $nodeProcesses -and -not $edgeProcesses) {
    Write-Host "`n✅ All processes stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some processes may still be running:" -ForegroundColor Yellow
    if ($nodeProcesses) { Write-Host "   Node: $($nodeProcesses.Count) process(es)" }
    if ($edgeProcesses) { Write-Host "   Edge: $($edgeProcesses.Count) process(es)" }
}
