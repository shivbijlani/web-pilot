# 🌐 Web Pilot

**LLM-Driven Browser Automation & Control**

Web Pilot is a tool that enables AI copilots and LLMs to control a web browser through simple file-based commands. It bridges the gap between conversational AI and real-world web interactions.

## ✨ Features

- **File-Based Communication** - Simple `command.txt` / `result.txt` interface that any LLM can use
- **Full Browser Control** - Navigate, click, type, scroll, screenshot, and extract data
- **Playwright Powered** - Reliable automation with modern browser support
- **LLM Agnostic** - Works with any AI assistant, script, or automation tool
- **Real-Time Interaction** - Human can interact with the browser while LLM sends commands

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/web-pilot.git
cd web-pilot

# Install dependencies
npm install

# Install browser (first time only)
npm run install-browser
```

### Basic Usage

```bash
# Start with no URL (manual navigation)
npm start

# Start with a specific URL
npm start https://example.com

# Or use the CLI directly
node src/cli.js --url https://github.com --dir ./output
```

## 📋 Commands

Write any of these commands to `command.txt` and read the result from `result.txt`:

| Command | Description |
|---------|-------------|
| `screenshot` | Take a full-page screenshot |
| `text` | Extract all visible text from the page |
| `html` | Save the page HTML to file |
| `url` | Get the current URL |
| `title` | Get the page title |
| `tables` | Extract all tables from the page |
| `links` | Extract all links from the page |
| `goto:<url>` | Navigate to a URL |
| `click:<selector>` | Click an element (CSS selector or text) |
| `type:<selector>:<text>` | Type text into an input field |
| `wait:<seconds>` | Wait for specified seconds |
| `scroll:<direction>` | Scroll the page (up/down/top/bottom) |
| `back` | Go back in browser history |
| `forward` | Go forward in browser history |
| `refresh` | Refresh the current page |
| `quit` | Close the browser and exit |

## 🤖 LLM Integration

### How It Works

```
┌─────────────┐     command.txt      ┌─────────────┐
│             │ ─────────────────▶   │             │
│     LLM     │                      │  Web Pilot  │ ◀──▶ 🌐 Browser
│             │ ◀─────────────────   │             │
└─────────────┘     result.txt       └─────────────┘
```

1. Web Pilot starts a browser and watches `command.txt`
2. Your LLM writes a command to `command.txt`
3. Web Pilot executes the command in the browser
4. Results are written to `result.txt`
5. Your LLM reads `result.txt` to see the outcome

### Example: Sending Commands from a Script

```bash
# Navigate to a page
echo "goto:https://github.com" > command.txt
sleep 2
cat result.txt

# Take a screenshot
echo "screenshot" > command.txt
sleep 2
cat result.txt

# Extract page text
echo "text" > command.txt
sleep 2
cat result.txt
```

### Example: PowerShell Integration

```powershell
# Send a command
Set-Content -Path "command.txt" -Value "text" -NoNewline

# Wait and read result
Start-Sleep -Seconds 2
Get-Content "result.txt"
```

### Example: Python Integration

```python
import time

def send_command(cmd):
    with open('command.txt', 'w') as f:
        f.write(cmd)
    time.sleep(2)
    with open('result.txt', 'r') as f:
        return f.read()

# Usage
result = send_command('goto:https://example.com')
print(result)

text = send_command('text')
print(text)
```

## 🔧 Configuration

### CLI Options

```
web-pilot [options] [url]

Options:
  --url, -u <url>     Starting URL to navigate to
  --dir, -d <path>    Working directory for files (default: current)
  --headless          Run browser in headless mode
  --help, -h          Show help
```

### Programmatic Usage

```javascript
const WebPilot = require('./src/pilot');

const pilot = new WebPilot({
  workDir: './output',      // Where to save files
  headless: false,          // Show browser window
  pollInterval: 1000,       // Command check interval (ms)
  timeout: 30000,           // Navigation timeout (ms)
  viewport: { width: 1400, height: 900 }
});

pilot.start('https://example.com');
```

## 📁 File Structure

```
web-pilot/
├── src/
│   ├── pilot.js      # Main WebPilot class
│   └── cli.js        # Command-line interface
├── package.json
├── README.md
└── .gitignore
```

## 🎯 Use Cases

- **AI-Assisted Web Research** - Let your LLM navigate and extract information
- **Automated Form Filling** - Guide an AI to fill out web forms
- **Web Scraping with Intelligence** - Combine LLM reasoning with browser automation
- **Testing & QA** - Use natural language to describe test scenarios
- **Accessibility** - Help users navigate complex websites through conversation

## ⚠️ Limitations

- Commands are processed sequentially (one at a time)
- Some websites may block automated browsers
- Login sessions may expire; human intervention needed for authentication
- File-based communication has ~1 second latency

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add new commands
- Improve error handling
- Add support for multiple browser tabs
- Create integrations for specific LLM platforms

## 📄 License

MIT License - feel free to use in your projects!

---

**Built with ❤️ for the AI-assisted future of web browsing**
