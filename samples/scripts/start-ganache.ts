#!/usr/bin/env node

/**
 * Ganache Local Blockchain for MetaMask Mobile Maestro Tests
 * Replicates the Ganache setup from Detox E2E tests
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';

interface GanacheConfig {
  port: number;
  chainId: number;
  mnemonic: string;
  hardfork: string;
  accounts: number;
  defaultBalanceEther: number;
  gasLimit: number;
  gasPrice: number;
}

// Ganache configuration matching Detox setup
const GANACHE_CONFIG: GanacheConfig = {
  port: 8545,
  chainId: 1,
  mnemonic: 'drive manage close raven tape average sausage pledge riot furnace august tip',
  hardfork: 'london',
  accounts: 10,
  defaultBalanceEther: 1000,
  gasLimit: 30000000,
  gasPrice: 20000000000
};

// Start Ganache with configuration
const ganache: ChildProcess = spawn('npx', [
  'ganache',
  '--port', GANACHE_CONFIG.port.toString(),
  '--chain.chainId', GANACHE_CONFIG.chainId.toString(),
  '--wallet.mnemonic', `"${GANACHE_CONFIG.mnemonic}"`,
  '--hardfork', GANACHE_CONFIG.hardfork,
  '--wallet.accounts', GANACHE_CONFIG.accounts.toString(),
  '--wallet.defaultBalance', GANACHE_CONFIG.defaultBalanceEther.toString(),
  '--miner.blockGasLimit', GANACHE_CONFIG.gasLimit.toString(),
  '--chain.vmErrorsOnRPCResponse', 'true',
  '--logging.quiet', 'false'
], {
  stdio: 'pipe',
  detached: true
});

// Handle Ganache output
ganache.stdout?.on('data', (data: Buffer) => {
  const output = data.toString();
  
  // Check if Ganache is ready
  if (output.includes('Listening on')) {
    // Write PID file for cleanup
    if (ganache.pid) {
      fs.writeFileSync('/tmp/metamask-ganache.pid', ganache.pid.toString());
    }
  }
});

ganache.stderr?.on('data', (data: Buffer) => {
  // Handle stderr if needed
});

ganache.on('close', (code: number | null) => {
  // Handle process close
});

ganache.on('error', (error: Error) => {
  process.exit(1);
});

// Keep the process running
process.on('SIGTERM', () => {
  ganache.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  ganache.kill('SIGINT');
  process.exit(0);
});
