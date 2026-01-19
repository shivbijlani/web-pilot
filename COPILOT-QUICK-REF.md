# Quick Reference for Copilot

## When User Says "Run web-pilot" or "Test web-pilot"

### 1. First Time Setup
```powershell
node src/cli.js --select-profile
# User selects profile, then exits
```

### 2. Run in Background
```powershell
node src/cli.js --background
```

### 3. Wait for Startup
```powershell
Start-Sleep -Seconds 5
```

### 4. Verify (check logs)
```powershell
Get-Content web-pilot.log
```

### 5. Send Commands
```powershell
'command' | Out-File -FilePath command.txt -Encoding utf8 -NoNewline
Start-Sleep -Seconds 2
Get-Content result.txt
```

### 6. Stop When Done
```powershell
.\stop-background.ps1
```

## Never Do
❌ `run_in_terminal` with `isBackground: true` (doesn't work properly)
❌ Use `echo` or `>` for command.txt (adds BOM)

## Always Do
✅ Use `node src/cli.js --background` for background execution
✅ Use `Out-File -Encoding utf8 -NoNewline` for command.txt
✅ Wait 5+ seconds after starting for browser initialization

## Files Created
- `.copilot-instructions.md` - Full workflow documentation
- `.copilot-constitution.md` - Core principles and rules
- `start-background.ps1` - Start helper script
- `stop-background.ps1` - Stop helper script  
- `example-background-test.ps1` - Complete example
- `COPILOT-QUICK-REF.md` - This file

## Important Files
- `.web-pilot-prefs.json` - Saved browser/profile preferences
- `web-pilot.log` - Background process logs
- `command.txt` - Command input
- `result.txt` - Command output
