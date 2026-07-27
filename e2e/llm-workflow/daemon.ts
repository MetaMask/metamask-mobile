#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import path from 'path';
import {
  createServer,
  KnowledgeStore,
  setKnowledgeStore,
} from '@metamask/client-mcp-core';

import { DEFAULT_ANVIL_PORT } from '../../tests/framework/Constants';
import {
  createMetaMaskMobileE2EContext,
  createMetaMaskMobileProdContext,
} from './capabilities';
import { MetaMaskMobileSessionManager } from './metamask-provider';
import { resolveRepoRoot } from './resolve-repo-root';

// Single shared KnowledgeStore instance used by both the global singleton
// (for session manager metadata recording) and createServer (for tool context).
const knowledgeStore = new KnowledgeStore();
setKnowledgeStore(knowledgeStore);

/**
 * Parse an environment variable as a TCP port number.
 * Returns `fallback` when the variable is unset or invalid.
 */
function resolvePort(envVar: string, fallback: number): number {
  const raw = process.env[envVar]?.trim();
  if (!raw) return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    process.stderr.write(
      `[mm-mobile] Ignoring invalid ${envVar}="${raw}" (must be integer 1-65535). Using default ${fallback}.\n`,
    );
    return fallback;
  }
  return port;
}

// E2E service ports. The app's persisted state (from FixtureBuilder) embeds
// these ports in RPC URLs, so services must listen on matching ports.
//
// Override via environment variables for parallel worktree isolation:
//   MM_ANVIL_PORT=8546 MM_FIXTURE_PORT=12346 MM_MOCK_PORT=8001 mm launch --context e2e
//
// NOTE: When overriding ports, the fixture data served by FixtureBuilder must
// also reference the same ports. The default fixture presets embed the default
// values below; custom presets must match any overrides.
const E2E_PORTS = {
  anvil: resolvePort('MM_ANVIL_PORT', DEFAULT_ANVIL_PORT),
  fixtureServer: resolvePort('MM_FIXTURE_PORT', 12345),
  mockServer: resolvePort('MM_MOCK_PORT', 8000),
};

const sessionManager = new MetaMaskMobileSessionManager();

// Register E2E capabilities on the session manager. They are accessible only
// through the guarded getters (getChainCapability, getFixtureCapability, etc.)
// which check `currentContext === 'e2e'` before returning them.
//
// They are deliberately NOT returned from contextFactory. Core tools that
// read `context.workflowContext.X` directly will find undefined and correctly
// fall back to the guarded getters, ensuring prod mode never exposes E2E
// capabilities.
sessionManager.registerE2ECapabilities(
  createMetaMaskMobileE2EContext({
    config: {
      ports: {
        anvil: E2E_PORTS.anvil,
        fixtureServer: E2E_PORTS.fixtureServer,
      },
    },
    mockServer: { port: E2E_PORTS.mockServer },
    getPlatformDriver: () => sessionManager.getPlatformDriver(),
  }),
);

const server = createServer({
  sessionManager,
  knowledgeStore,
  idleShutdownMs: 30 * 60 * 1000,
  logFilePath: path.join(resolveRepoRoot(), '.mm-daemon.log'),
  contextFactory: async () => {
    // Return a prod-safe context: only stateSnapshot and config. E2E
    // capabilities (chain, fixture, contractSeeding, mockServer) live on
    // the session manager and are exposed through guarded getters. This
    // prevents core tools from bypassing context guards via direct
    // workflowContext property access.
    const prodCtx = createMetaMaskMobileProdContext({
      getPlatformDriver: () => sessionManager.getPlatformDriver(),
    });

    return {
      ...prodCtx,
      allocatedPorts: {
        anvil: E2E_PORTS.anvil,
        fixture: E2E_PORTS.fixtureServer,
        mock: E2E_PORTS.mockServer,
      },
    };
  },
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
