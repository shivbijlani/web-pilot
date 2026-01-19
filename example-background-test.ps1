# Example: Complete workflow for testing web-pilot with background execution

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Web-Pilot Background Testing Example" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Step 1: Check for preferences
Write-Host "📋 Step 1: Checking for saved preferences..." -ForegroundColor Yellow
if (Test-Path ".web-pilot-prefs.json") {
    $prefs = Get-Content ".web-pilot-prefs.json" | ConvertFrom-Json
    Write-Host "   ✅ Found preferences:" -ForegroundColor Green
    Write-Host "      Browser: $($prefs.browser)" -ForegroundColor Gray
    Write-Host "      Profile: $($prefs.profile)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  No preferences found. Run 'node src/cli.js' first to select profile.`n" -ForegroundColor Yellow
    exit
}

# Step 2: Start background process
Write-Host "`n🚀 Step 2: Starting web-pilot in background..." -ForegroundColor Yellow
node src/cli.js --background

# Step 3: Wait for startup
Write-Host "`n⏳ Step 3: Waiting for browser to fully start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 4: Send test commands
Write-Host "`n📤 Step 4: Sending test commands..." -ForegroundColor Yellow

Write-Host "   → goto:https://example.com" -ForegroundColor Cyan
'goto:https://example.com' | Out-File -FilePath command.txt -Encoding utf8 -NoNewline
Start-Sleep -Seconds 3
$result = Get-Content result.txt
Write-Host "   ✅ Result: $result" -ForegroundColor Green

Write-Host "`n   → title" -ForegroundColor Cyan
'title' | Out-File -FilePath command.txt -Encoding utf8 -NoNewline
Start-Sleep -Seconds 2
$result = Get-Content result.txt
Write-Host "   ✅ Result: $result" -ForegroundColor Green

Write-Host "`n   → execute:document.body.innerText.substring(0, 100)" -ForegroundColor Cyan
'execute:document.body.innerText.substring(0, 100)' | Out-File -FilePath command.txt -Encoding utf8 -NoNewline
Start-Sleep -Seconds 2
$result = Get-Content result.txt
Write-Host "   ✅ Result: $result" -ForegroundColor Green

# Step 5: Verify process is still running
Write-Host "`n🔍 Step 5: Verifying background process..." -ForegroundColor Yellow
$nodeProc = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProc) {
    Write-Host "   ✅ Node process is running (PID: $($nodeProc.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node process is not running!" -ForegroundColor Red
}

# Step 6: Instructions
Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Example complete! Web-pilot is still running." -ForegroundColor Green
Write-Host "`nYou can now:" -ForegroundColor White
Write-Host "  • Write more commands to command.txt" -ForegroundColor Gray
Write-Host "  • Read results from result.txt" -ForegroundColor Gray
Write-Host "  • Check process: Get-Process -Name node" -ForegroundColor Gray
Write-Host "  • Stop when done: .\stop-background.ps1" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
