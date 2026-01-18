#!/usr/bin/env node

/**
 * Web Pilot CLI
 * Command-line interface for launching the Web Pilot browser automation tool
 */

const WebPilot = require('./pilot');
const path = require('path');

function printUsage() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        🌐 WEB PILOT                              ║
║         LLM-Driven Browser Automation & Control                  ║
╚══════════════════════════════════════════════════════════════════╝

USAGE:
  web-pilot [options] [url]

OPTIONS:
  --url, -u <url>        Starting URL to navigate to
  --dir, -d <path>       Working directory for command/result files (default: current dir)
  --profile <path>       Chrome profile path (enables persistent context with saved passwords/cookies)
  --headless             Run browser in headless mode
  --help, -h             Show this help message

EXAMPLES:
  web-pilot
  web-pilot https://example.com
  web-pilot -u https://github.com -d ./output
  web-pilot --headless -u https://example.com
  web-pilot --profile "C:\Users\username\AppData\Local\Google\Chrome\User Data"

HOW IT WORKS:
  1. Web Pilot starts a browser and watches for commands in 'command.txt'
  2. An LLM (or any process) writes commands to 'command.txt'
  3. Web Pilot executes the command and writes results to 'result.txt'
  4. The LLM reads 'result.txt' to see the outcome

COMMANDS:
  screenshot             Take a full-page screenshot
  text                   Extract all visible text from the page
  html                   Save the page HTML
  url                    Get the current URL
  title                  Get the page title
  tables                 Extract all tables from the page
  links                  Extract all links from the page
  goto:<url>             Navigate to a URL
  click:<selector>       Click an element (CSS selector or text)
  type:<selector>:<text> Type text into an input field
  wait:<seconds>         Wait for specified seconds
  scroll:<direction>     Scroll the page (up/down/top/bottom)
  back                   Go back in browser history
  forward                Go forward in browser history
  refresh                Refresh the current page
  quit                   Close the browser and exit

INTEGRATION WITH LLMs:
  To send a command from an LLM/script:
    echo "screenshot" > command.txt
    
  To read the result:
    cat result.txt
`);
}

function parseArgs(args) {
  const config = {
    url: null,
    workDir: process.cwd(),
    headless: false,
    profile: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    
    if (arg === '--url' || arg === '-u') {
      config.url = args[++i];
    } else if (arg === '--dir' || arg === '-d') {
      config.workDir = path.resolve(args[++i]);
    } else if (arg === '--profile') {
      config.profile = args[++i];
    } else if (arg === '--headless') {
      config.headless = true;
    } else if (!arg.startsWith('-') && !config.url) {
      // Treat positional argument as URL
      config.url = arg;
    }
  }

  return config;
}

async function main() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        🌐 WEB PILOT                              ║
║         LLM-Driven Browser Automation & Control                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  const pilot = new WebPilot({
    workDir: config.workDir,
    headless: config.headless,
    profile: config.profile
  });

  await pilot.start(config.url);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
