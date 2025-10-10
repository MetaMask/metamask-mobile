#!/usr/bin/env node

/**
 * Stop all servers for MetaMask Mobile Maestro Tests
 * Cleans up mock server, Ganache, and fixture server
 */

import * as fs from 'fs';

const PID_FILES: string[] = [
  '/tmp/metamask-comprehensive-mock-server.pid',
  '/tmp/metamask-ganache.pid',
  '/tmp/metamask-fixture-server.pid'
];

const SERVER_NAMES: string[] = [
  'Comprehensive Mock Server',
  'Ganache',
  'Fixture Server'
];

PID_FILES.forEach((pidFile: string, index: number) => {
  const serverName = SERVER_NAMES[index];
  
  try {
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf8').trim();
      
      try {
        process.kill(parseInt(pid), 'SIGTERM');
      } catch (error) {
        // Process may already be stopped
      }
      
      // Clean up PID file
      fs.unlinkSync(pidFile);
    }
  } catch (error) {
    // Handle any cleanup errors silently
  }
});
