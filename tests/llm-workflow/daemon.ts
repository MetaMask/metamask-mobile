#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import path from 'path';
import { createServer } from '@metamask/client-mcp-core';

import { createMetaMaskMobileContext } from './capabilities';
import { MetaMaskMobileSessionManager } from './metamask-provider';
import { resolveRepoRoot } from './resolve-repo-root';

const sessionManager = new MetaMaskMobileSessionManager();

const server = createServer({
  sessionManager,
  idleShutdownMs: 30 * 60 * 1000,
  requestTimeoutMs: 180 * 1000,
  logFilePath: path.join(resolveRepoRoot(), '.mm-daemon.log'),
  contextFactory: async () =>
    createMetaMaskMobileContext({
      getPlatformDriver: () => sessionManager.getPlatformDriver(),
    }),
});

server
  .start()
  .then((state) => {
    process.stderr.write(
      `MetaMask Mobile daemon started on port ${state.port}\n`,
    );
  })
  .catch((error: Error) => {
    process.stderr.write(`Failed to start daemon: ${error.message}\n`);
    process.exit(1);
  });
