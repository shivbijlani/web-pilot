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
  --browser <type>       Browser to use: chrome or edge (auto-detected if not specified)
  --profile <path>       Browser profile path (auto-detected if not specified)
  --no-profile           Disable profile - use fresh browser session
  --select-profile       Select and save browser profile (setup mode, then exit)
  --background           Run in background (detached process, recommended for LLM/Copilot)
  --headless             Run browser in headless mode
  --help, -h             Show this help message

AUTO-DETECTION:
  By default, web-pilot automatically detects your system's default browser
  and uses its profile (with saved passwords, cookies, etc.). This means you
  can just run 'web-pilot' without any arguments!

EXAMPLES:
  web-pilot --select-profile   # First-time setup: select and save profile
  web-pilot --background       # Run in background (requires saved profile)
  web-pilot                    # Auto-detect browser and profile
  web-pilot https://example.com
  web-pilot --no-profile       # Use fresh session without profile
  web-pilot -u https://github.com -d ./output
  web-pilot --headless -u https://example.com
  web-pilot --browser edge
  web-pilot --profile "C:\\\\Users\\\\username\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\User Data"
  web-pilot --browser edge --profile "C:\\\\Users\\\\username\\\\AppData\\\\Local\\\\Microsoft\\\\Edge\\\\User Data"

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
    background: false,
    selectProfile: false,
    browser: null, // Will be auto-detected if not specified
    profile: undefined, // undefined means auto-detect, null means disabled
    autoProfile: true
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
    } else if (arg === '--browser') {
      const browser = args[++i]?.toLowerCase();
      if (browser === 'chrome' || browser === 'edge') {
        config.browser = browser;
      } else {
        console.error(`Invalid browser: ${browser}. Use 'chrome' or 'edge'.`);
        process.exit(1);
      }
    } else if (arg === '--profile') {
      config.profile = args[++i];
      config.autoProfile = false;
    } else if (arg === '--no-profile') {
      config.profile = null;
      config.autoProfile = false;
    } else if (arg === '--select-profile') {
      config.selectProfile = true;
    } else if (arg === '--background') {
      config.background = true;
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

  // If background mode requested, spawn detached process
  if (config.background) {
    const { spawn } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    // Remove --background flag from args
    const childArgs = args.filter(arg => arg !== '--background');
    
    // Create log file for background process output
    const logPath = path.join(config.workDir, 'web-pilot.log');
    const logFd = fs.openSync(logPath, 'w');
    
    // Spawn detached process with output redirected to log file
    const child = spawn(process.argv[0], [process.argv[1], ...childArgs], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      cwd: config.workDir,
      env: { ...process.env, WEB_PILOT_BACKGROUND: '1' }
    });
    
    child.unref();
    
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        🌐 WEB PILOT                              ║
║         LLM-Driven Browser Automation & Control                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
    console.log(`🚀 Web Pilot started in background (PID: ${child.pid})`);
    console.log(`📁 Working directory: ${config.workDir}`);
    console.log(`📄 Log file: ${logPath}`);
    console.log(`\n   The process is now detached and running in the background.`);
    console.log(`   Terminal is free for other commands!`);
    console.log(`   Check ${path.basename(logPath)} for startup messages.\n`);
    
    process.exit(0);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        🌐 WEB PILOT                              ║
║         LLM-Driven Browser Automation & Control                  ║
╚══════════════════════════════════════════════════════════════════╝
`);



  const pilot = new WebPilot({
    workDir: config.workDir,
    headless: config.headless,
    browser: config.browser,
    profile: config.profile,
    autoProfile: config.autoProfile,
    background: config.background,
    selectProfile: config.selectProfile
  });

  await pilot.initialize();
  
  // If --select-profile mode, exit after initialization (profile saved)
  if (config.selectProfile) {
    console.log('\n✅ Profile selection complete!');
    console.log('   You can now run with --background flag.\n');
    process.exit(0);
  }
  
  await pilot.start(config.url);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
