#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import path from 'path';
import {
  createServer,
  KnowledgeStore,
  setKnowledgeStore,
} from '@metamask/client-mcp-core';

import { DEFAULT_ANVIL_PORT } from '../../tests/framework/Constants';
import { createMetaMaskMobileE2EContext } from './capabilities';
import { MetaMaskMobileSessionManager } from './metamask-provider';
import { resolveRepoRoot } from './resolve-repo-root';
import { checkPortAvailable } from './utils';

// Single shared KnowledgeStore instance used by both the global singleton
// (for session manager metadata recording) and createServer (for tool context).
const knowledgeStore = new KnowledgeStore();
setKnowledgeStore(knowledgeStore);

// Default ports matching the values hardcoded in fixture data.
// The app's persisted state (from FixtureBuilder) embeds these ports in RPC URLs,
// so services must listen on these exact ports for the app to reach them.
// Ports are fixed per-worktree; preflight checks below detect collisions early.
const DEFAULT_PORTS = {
  anvil: DEFAULT_ANVIL_PORT,
  fixtureServer: 12345,
  mockServer: 8000,
} as const;

const sessionManager = new MetaMaskMobileSessionManager();

const server = createServer({
  sessionManager,
  knowledgeStore,
  idleShutdownMs: 30 * 60 * 1000,
  logFilePath: path.join(resolveRepoRoot(), '.mm-daemon.log'),
  contextFactory: async () => {
    const ctx = createMetaMaskMobileE2EContext({
      config: {
        ports: {
          anvil: DEFAULT_PORTS.anvil,
          fixtureServer: DEFAULT_PORTS.fixtureServer,
        },
      },
      mockServer: { port: DEFAULT_PORTS.mockServer },
      getPlatformDriver: () => sessionManager.getPlatformDriver(),
    });

    return {
      ...ctx,
      allocatedPorts: {
        anvil: DEFAULT_PORTS.anvil,
        fixture: DEFAULT_PORTS.fixtureServer,
        mock: DEFAULT_PORTS.mockServer,
      },
    };
  },
});

async function assertPortsAvailable(
  ports: Record<string, number>,
): Promise<void> {
  for (const [label, port] of Object.entries(ports)) {
    await checkPortAvailable(port, label);
  }
}

assertPortsAvailable(DEFAULT_PORTS)
  .then(() => server.start())
  .then((state) => {
    process.stderr.write(
      `MetaMask Mobile daemon started on port ${state.port}\n`,
    );
  })
  .catch((error: Error) => {
    process.stderr.write(`Failed to start daemon: ${error.message}\n`);
    process.exit(1);
  });
