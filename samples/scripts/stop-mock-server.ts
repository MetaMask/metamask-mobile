#!/usr/bin/env node

/**
 * Stop the mock server for MetaMask Mobile Maestro tests
 */

import * as fs from 'fs';

const PID_FILE = '/tmp/metamask-mock-server.pid';

try {
  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    
    try {
      process.kill(parseInt(pid), 'SIGTERM');
    } catch (error) {
      // Process may already be stopped
    }
    
    // Clean up PID file
    fs.unlinkSync(PID_FILE);
  }
} catch (error) {
  // Handle any cleanup errors silently
}
