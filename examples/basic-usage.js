/**
 * Web Pilot - Example Usage
 * 
 * This example shows how to use Web Pilot programmatically
 * to automate a simple web task.
 */

const WebPilot = require('../src/pilot');
const fs = require('fs');
const path = require('path');

// Helper to send a command and wait for result
async function sendCommand(workDir, command, waitMs = 2000) {
  const commandPath = path.join(workDir, 'command.txt');
  const resultPath = path.join(workDir, 'result.txt');
  
  // Clear previous result
  fs.writeFileSync(resultPath, '');
  
  // Write command
  fs.writeFileSync(commandPath, command);
  
  // Wait for processing
  await new Promise(r => setTimeout(r, waitMs));
  
  // Read result
  return fs.readFileSync(resultPath, 'utf-8');
}

async function main() {
  const workDir = path.join(__dirname, 'output');
  
  // Create output directory
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }
  
  // Start Web Pilot
  const pilot = new WebPilot({ workDir });
  
  // Start in background (don't await - it runs forever)
  pilot.start('https://example.com').catch(console.error);
  
  // Wait for browser to start
  await new Promise(r => setTimeout(r, 3000));
  
  // Now send commands
  console.log('Sending commands...\n');
  
  // Get page title
  let result = await sendCommand(workDir, 'title');
  console.log('Title:', result);
  
  // Get page text
  result = await sendCommand(workDir, 'text');
  console.log('Text preview:', result.substring(0, 200) + '...\n');
  
  // Take screenshot
  result = await sendCommand(workDir, 'screenshot');
  console.log('Screenshot:', result);
  
  // Navigate to another page
  result = await sendCommand(workDir, 'goto:https://httpbin.org/html', 3000);
  console.log('Navigation:', result);
  
  // Get new page text
  result = await sendCommand(workDir, 'text');
  console.log('New page text preview:', result.substring(0, 200) + '...\n');
  
  // Quit
  console.log('Done! Closing browser...');
  await sendCommand(workDir, 'quit');
}

// Only run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendCommand };
