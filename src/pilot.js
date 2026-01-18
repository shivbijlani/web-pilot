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

// Default configuration
const DEFAULT_CONFIG = {
  commandFile: 'command.txt',
  resultFile: 'result.txt',
  workDir: process.cwd(),
  headless: false,
  pollInterval: 1000,
  timeout: 30000,
  viewport: { width: 1400, height: 900 },
  profile: null
};

class WebPilot {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.browser = null;
    this.context = null;
    this.page = null;
    this.running = false;
    this.lastCommand = '';
    
    // Resolve paths
    this.commandPath = path.join(this.config.workDir, this.config.commandFile);
    this.resultPath = path.join(this.config.workDir, this.config.resultFile);
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
    console.log('🚀 Web Pilot - Starting browser...\n');
    
    if (this.config.profile) {
      // Use persistent context when profile path is provided
      console.log(`📂 Using Chrome profile: ${this.config.profile}`);
      this.context = await chromium.launchPersistentContext(this.config.profile, {
        headless: this.config.headless,
        viewport: this.config.viewport,
        args: ['--start-maximized']
      });
      
      // Get the first page or create a new one
      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    } else {
      // Standard launch without profile
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--start-maximized']
      });

      this.context = await this.browser.newContext({
        viewport: this.config.viewport
      });
      
      this.page = await this.context.newPage();
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
