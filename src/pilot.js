#!/usr/bin/env node

/**
 * Web Pilot - LLM-Driven Browser Automation
 * 
 * A tool that allows LLMs to control a browser through file-based commands,
 * enabling AI copilots to navigate websites and perform actions.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const readline = require('readline');

// Default configuration
const DEFAULT_CONFIG = {
  commandFile: 'command.txt',
  resultFile: 'result.txt',
  workDir: process.cwd(),
  headless: false,
  browser: 'chrome',
  pollInterval: 1000,
  timeout: 30000,
  viewport: { width: 1400, height: 900 },
  profile: null
};

class WebPilot {
  /**
   * Detect the system's default browser
   */
  static detectDefaultBrowser() {
    try {
      if (process.platform !== 'win32') {
        return 'chrome'; // Default to Chrome on non-Windows
      }
      
      // Query Windows registry for default browser
      const result = execSync(
        'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId',
        { encoding: 'utf-8' }
      );
      
      // Parse the result to find browser type
      if (result.includes('MSEdge') || result.includes('EdgeHTML')) {
        return 'edge';
      } else if (result.includes('Chrome')) {
        return 'chrome';
      }
      
      return 'chrome'; // Default fallback
    } catch (err) {
      return 'chrome'; // Default fallback on error
    }
  }

  /**
   * Get default profile path for a browser
   */
  static getDefaultProfilePath(browserType) {
    try {
      const username = os.userInfo().username;
      const userProfile = process.env.USERPROFILE || `C:\\Users\\${username}`;
      
      if (browserType === 'edge') {
        return path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data');
      } else {
        return path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
      }
    } catch (err) {
      return null;
    }
  }

  /**
   * List available profiles in a browser's User Data directory
   */
  static listProfiles(userDataDir) {
    try {
      if (!fs.existsSync(userDataDir)) {
        return [];
      }

      // First, try to read Local State for profile metadata
      const localStatePath = path.join(userDataDir, 'Local State');
      let profileInfoCache = {};
      
      if (fs.existsSync(localStatePath)) {
        try {
          const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf-8'));
          profileInfoCache = localState?.profile?.info_cache || {};
        } catch (err) {
          // Continue without metadata
        }
      }

      const profiles = [];
      const entries = fs.readdirSync(userDataDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // Check if it's a profile directory (Default, Profile 1, Profile 2, etc.)
        const dirName = entry.name;
        if (dirName === 'Default' || dirName.startsWith('Profile ')) {
          const profilePath = path.join(userDataDir, dirName);
          
          // Get profile metadata from Local State
          const metadata = profileInfoCache[dirName];
          let displayName = dirName;
          
          if (metadata) {
            // Prefer user_name (email), then gaia_name (full name), then shortcut_name
            displayName = metadata.user_name || metadata.gaia_name || metadata.shortcut_name || metadata.name || dirName;
          }
          
          profiles.push({
            path: profilePath,
            dirName: dirName,
            displayName: displayName,
            userName: metadata?.user_name || '',
            fullName: metadata?.gaia_name || ''
          });
        }
      }

      return profiles;
    } catch (err) {
      return [];
    }
  }

  /**
   * Prompt user to select a profile
   */
  static async promptProfileSelection(profiles, browserName) {
    return new Promise((resolve) => {
      console.log(`\n📂 Multiple ${browserName} profiles detected:\n`);
      
      profiles.forEach((profile, index) => {
        // Build a helpful display name
        let displayText = '';
        
        // Prefer email (user_name) first as it's most specific
        if (profile.userName) {
          displayText = profile.userName;
        } else if (profile.fullName) {
          displayText = profile.fullName;
        } else {
          displayText = profile.displayName;
        }
        
        // Always show the folder name in brackets
        displayText += ` [${profile.dirName}]`;
        
        console.log(`   ${index + 1}. ${displayText}`);
      });
      console.log(`   ${profiles.length + 1}. Use fresh session (no profile)\n`);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Select profile number: ', (answer) => {
        rl.close();
        
        const choice = parseInt(answer);
        if (choice >= 1 && choice <= profiles.length) {
          resolve(profiles[choice - 1].path);
        } else if (choice === profiles.length + 1) {
          resolve(null); // No profile
        } else {
          console.log('Invalid selection. Using first profile.');
          resolve(profiles[0].path);
        }
      });
    });
  }

  constructor(config = {}) {
    // Store config for async initialization
    this._config = config;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.running = false;
    this.lastCommand = '';
    this.config = null; // Will be set in initialize()
  }

  /**
   * Initialize the WebPilot instance (async)
   */
  async initialize() {
    const config = this._config;
    
    // Auto-detect browser if not provided
    const detectedBrowser = config.browser || WebPilot.detectDefaultBrowser();
    
    // Handle profile selection
    let detectedProfile;
    
    if (config.profile !== undefined) {
      // Explicitly set by user
      detectedProfile = config.profile;
    } else if (config.autoProfile === false) {
      // User explicitly disabled auto profile
      detectedProfile = null;
    } else {
      // Auto-detect profile with selection
      const userDataDir = WebPilot.getDefaultProfilePath(detectedBrowser);
      
      if (userDataDir) {
        const profiles = WebPilot.listProfiles(userDataDir);
        
        if (profiles.length > 1) {
          // Multiple profiles - ask user to choose
          const browserName = detectedBrowser === 'edge' ? 'Edge' : 'Chrome';
          const selectedProfilePath = await WebPilot.promptProfileSelection(profiles, browserName);
          detectedProfile = selectedProfilePath;
        } else if (profiles.length === 1) {
          // Single profile - use it
          detectedProfile = profiles[0].path;
        } else {
          // No profiles found
          detectedProfile = null;
        }
      } else {
        detectedProfile = null;
      }
    }
    
    this.config = { 
      ...DEFAULT_CONFIG, 
      ...config,
      browser: detectedBrowser,
      profile: detectedProfile
    };
    
    // Resolve paths
    this.commandPath = path.join(this.config.workDir, this.config.commandFile);
    this.resultPath = path.join(this.config.workDir, this.config.resultFile);
    
    return this;
  }

  /**
   * Check if a browser process is running
   */
  isBrowserRunning(browserName) {
    try {
      const processName = browserName === 'edge' ? 'msedge.exe' : 'chrome.exe';
      const result = execSync(`tasklist /FI "IMAGENAME eq ${processName}" /NH`, { encoding: 'utf-8' });
      return result.toLowerCase().includes(processName.toLowerCase());
    } catch (err) {
      return false;
    }
  }

  /**
   * Display user-friendly error for locked profile
   */
  displayProfileLockedError(browserName) {
    console.error('\n❌ ERROR: Browser Profile is Locked\n');
    console.error(`The ${browserName} profile you specified is currently in use.\n`);
    console.error(`This happens when ${browserName} is already running with that profile.\n`);
    console.error('📋 How to fix this:\n');
    console.error(`   1. Close all ${browserName} windows`);
    console.error('   2. Check the system tray for any background browser processes');
    console.error('   3. Wait a few seconds, then try again\n');
    console.error('💡 Alternative solutions:\n');
    console.error('   • Run web-pilot WITHOUT --profile to use a fresh browser session');
    console.error(`   • Create a dedicated ${browserName} profile just for web-pilot`);
    console.error(`   • Use a different profile path that isn't currently active\n`);
    
    if (this.isBrowserRunning(this.config.browser)) {
      console.error(`⚠️  Detected ${browserName} is currently running!`);
      console.error(`   Please close ${browserName} completely and try again.\n`);
    }
  }

  /**
   * Available commands that can be sent via the command file
   */
  getCommands() {
    return {
      'screenshot': 'Take a full-page screenshot',
      'text': 'Extract all visible text from the page',
      'html': 'Save the page HTML',
      'url': 'Get the current URL',
      'title': 'Get the page title',
      'tables': 'Extract all tables from the page',
      'links': 'Extract all links from the page',
      'goto:<url>': 'Navigate to a URL',
      'click:<selector>': 'Click an element (CSS selector or text)',
      'type:<selector>:<text>': 'Type text into an input field',
      'wait:<seconds>': 'Wait for specified seconds',
      'scroll:<direction>': 'Scroll the page (up/down/top/bottom)',
      'back': 'Go back in browser history',
      'forward': 'Go forward in browser history',
      'refresh': 'Refresh the current page',
      'quit': 'Close the browser and exit'
    };
  }

  /**
   * Start the browser and begin listening for commands
   */
  async start(initialUrl = null) {
    const browserName = this.config.browser === 'edge' ? 'Edge' : 'Chrome';
    
    // Show what was detected/configured
    if (!this.config.profile) {
      console.log(`🚀 Web Pilot - Starting ${browserName}...\n`);
    } else {
      const wasAutoDetected = !arguments[0] && !process.argv.includes('--profile');
      console.log(`🚀 Web Pilot - Starting ${browserName}${wasAutoDetected ? ' (auto-detected)' : ''}...\n`);
    }
    
    // Determine Playwright channel based on browser choice
    const channel = this.config.browser === 'edge' ? 'msedge' : undefined;
    
    try {
      if (this.config.profile) {
        // Use persistent context when profile path is provided
        console.log(`📂 Using ${browserName} profile: ${this.config.profile}`);
        const launchOptions = {
          headless: this.config.headless,
          viewport: this.config.viewport,
          args: ['--start-maximized']
        };
        if (channel) launchOptions.channel = channel;
        
        this.context = await chromium.launchPersistentContext(this.config.profile, launchOptions);
        
        // Get the first page or create a new one
        const pages = this.context.pages();
        this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
      } else {
        // Standard launch without profile
        const launchOptions = {
          headless: this.config.headless,
          args: ['--start-maximized']
        };
        if (channel) launchOptions.channel = channel;
        
        this.browser = await chromium.launch(launchOptions);

        this.context = await this.browser.newContext({
          viewport: this.config.viewport
        });
        
        this.page = await this.context.newPage();
      }
    } catch (error) {
      // Check if it's a locked profile error
      if (this.config.profile && (error.message.includes('has been closed') || 
          error.message.includes('Target closed') ||
          error.message.includes('Browser closed'))) {
        this.displayProfileLockedError(browserName);
        process.exit(1);
      }
      // Re-throw other errors
      throw error;
    }

    if (initialUrl) {
      console.log(`📍 Navigating to: ${initialUrl}`);
      await this.page.goto(initialUrl, { waitUntil: 'domcontentloaded' });
    }

    // Clear old command file
    this.clearFile(this.commandPath);
    
    // Write ready status
    this.writeResult('READY: Browser is open and waiting for commands.');
    
    console.log('✅ Browser launched successfully!\n');
    console.log('📁 Command file:', this.commandPath);
    console.log('📁 Result file:', this.resultPath);
    console.log('\n📋 Available commands:');
    
    const commands = this.getCommands();
    Object.entries(commands).forEach(([cmd, desc]) => {
      console.log(`   ${cmd.padEnd(25)} - ${desc}`);
    });
    
    console.log('\n⏳ Listening for commands...\n');

    // Start command polling loop
    this.running = true;
    this.pollCommands();
  }

  /**
   * Poll for new commands in the command file
   */
  async pollCommands() {
    while (this.running) {
      await this.sleep(this.config.pollInterval);
      
      try {
        if (!fs.existsSync(this.commandPath)) continue;
        
        const command = fs.readFileSync(this.commandPath, 'utf-8').trim();
        if (!command || command === this.lastCommand) continue;
        
        this.lastCommand = command;
        console.log(`📥 Command: ${command}`);
        
        const result = await this.executeCommand(command);
        this.writeResult(result);
        
        console.log(`✅ Done\n`);
        
      } catch (err) {
        // Ignore file read errors during polling
      }
    }
  }

  /**
   * Execute a command and return the result
   */
  async executeCommand(command) {
    try {
      const cmd = command.toLowerCase();
      
      // Simple commands
      if (cmd === 'screenshot') {
        return await this.takeScreenshot();
      }
      
      if (cmd === 'text') {
        return await this.extractText();
      }
      
      if (cmd === 'html') {
        return await this.saveHtml();
      }
      
      if (cmd === 'url') {
        return `URL: ${this.page.url()}`;
      }
      
      if (cmd === 'title') {
        return `Title: ${await this.page.title()}`;
      }
      
      if (cmd === 'tables') {
        return await this.extractTables();
      }
      
      if (cmd === 'links') {
        return await this.extractLinks();
      }
      
      if (cmd === 'back') {
        await this.page.goBack();
        return `Navigated back to: ${this.page.url()}`;
      }
      
      if (cmd === 'forward') {
        await this.page.goForward();
        return `Navigated forward to: ${this.page.url()}`;
      }
      
      if (cmd === 'refresh') {
        await this.page.reload();
        return `Refreshed: ${this.page.url()}`;
      }
      
      if (cmd === 'quit') {
        this.running = false;
        // Close browser or persistent context depending on which was used
        if (this.browser) {
          await this.browser.close();
        } else if (this.context) {
          await this.context.close();
        }
        console.log('👋 Browser closed. Goodbye!');
        process.exit(0);
      }
      
      // Commands with parameters
      if (command.startsWith('goto:')) {
        const url = command.substring(5).trim();
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
        return `Navigated to: ${this.page.url()}`;
      }
      
      if (command.startsWith('click:')) {
        const selector = command.substring(6).trim();
        return await this.clickElement(selector);
      }
      
      if (command.startsWith('type:')) {
        const parts = command.substring(5).split(':');
        const selector = parts[0].trim();
        const text = parts.slice(1).join(':').trim();
        await this.page.fill(selector, text);
        return `Typed "${text}" into ${selector}`;
      }
      
      if (command.startsWith('wait:')) {
        const seconds = parseInt(command.substring(5).trim()) || 2;
        await this.sleep(seconds * 1000);
        return `Waited ${seconds} seconds`;
      }
      
      if (command.startsWith('scroll:')) {
        const direction = command.substring(7).trim().toLowerCase();
        return await this.scroll(direction);
      }
      
      return `ERROR: Unknown command: ${command}`;
      
    } catch (err) {
      return `ERROR: ${err.message}`;
    }
  }

  /**
   * Take a screenshot and save it
   */
  async takeScreenshot() {
    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(this.config.workDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return `Screenshot saved: ${filepath}`;
  }

  /**
   * Extract all visible text from the page
   */
  async extractText() {
    const text = await this.page.evaluate(() => document.body.innerText);
    const filepath = path.join(this.config.workDir, 'page-text.txt');
    fs.writeFileSync(filepath, text);
    return text;
  }

  /**
   * Save the page HTML
   */
  async saveHtml() {
    const html = await this.page.content();
    const filepath = path.join(this.config.workDir, 'page.html');
    fs.writeFileSync(filepath, html);
    return `HTML saved: ${filepath}`;
  }

  /**
   * Extract all tables from the page
   */
  async extractTables() {
    const tables = await this.page.evaluate(() => {
      const results = [];
      document.querySelectorAll('table').forEach((table, idx) => {
        let tableText = `\n=== TABLE ${idx + 1} ===\n`;
        table.querySelectorAll('tr').forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, th'))
            .map(cell => cell.innerText.trim().replace(/\s+/g, ' '));
          tableText += cells.join(' | ') + '\n';
        });
        results.push(tableText);
      });
      return results.join('\n');
    });
    
    const filepath = path.join(this.config.workDir, 'tables.txt');
    fs.writeFileSync(filepath, tables);
    return tables || 'No tables found on page';
  }

  /**
   * Extract all links from the page
   */
  async extractLinks() {
    const links = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(l => l.text && l.href)
        .slice(0, 50); // Limit to 50 links
    });
    
    const formatted = links.map(l => `${l.text}: ${l.href}`).join('\n');
    return `Found ${links.length} links:\n${formatted}`;
  }

  /**
   * Click an element by selector or text content
   */
  async clickElement(selector) {
    try {
      // First try as CSS selector
      await this.page.click(selector, { timeout: 5000 });
    } catch {
      // Try as text content
      await this.page.click(`text=${selector}`, { timeout: 5000 });
    }
    await this.page.waitForLoadState('domcontentloaded');
    return `Clicked: ${selector}`;
  }

  /**
   * Scroll the page
   */
  async scroll(direction) {
    switch (direction) {
      case 'up':
        await this.page.evaluate(() => window.scrollBy(0, -500));
        return 'Scrolled up';
      case 'down':
        await this.page.evaluate(() => window.scrollBy(0, 500));
        return 'Scrolled down';
      case 'top':
        await this.page.evaluate(() => window.scrollTo(0, 0));
        return 'Scrolled to top';
      case 'bottom':
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        return 'Scrolled to bottom';
      default:
        return `Unknown scroll direction: ${direction}`;
    }
  }

  /**
   * Write result to the result file
   */
  writeResult(content) {
    fs.writeFileSync(this.resultPath, content);
  }

  /**
   * Clear/delete a file
   */
  clearFile(filepath) {
    try {
      fs.unlinkSync(filepath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use as a module
module.exports = WebPilot;

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const url = args[0] || null;
  const workDir = args[1] || process.cwd();
  
  const pilot = new WebPilot({ workDir });
  pilot.start(url).catch(console.error);
}
