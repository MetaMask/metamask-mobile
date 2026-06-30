#!/usr/bin/env node
import path from 'path';
import {
  createServer,
  KnowledgeStore,
  setKnowledgeStore,
} from '@metamask/client-mcp-core';

import { MobileSessionManager } from './mobile-session-manager';

const bundleId = process.env.MM_BUNDLE_ID ?? 'io.metamask';

const knowledgeStore = new KnowledgeStore();
setKnowledgeStore(knowledgeStore);

function resolveRepoRoot(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

const server = createServer({
  sessionManager: new MobileSessionManager(bundleId),
  knowledgeStore,
  idleShutdownMs: 30 * 60 * 1000,
  logFilePath: path.join(resolveRepoRoot(), '.mm-daemon.log'),
  contextFactory: () => ({
    config: {
      environment: 'e2e' as const,
      extensionName: 'MetaMask Mobile',
      defaultPassword: '',
      artifactsDir: path.join(resolveRepoRoot(), 'test-artifacts'),
      defaultChainId: 1,
      ports: { anvil: 0, fixtureServer: 0 },
    },
  }),
});

server
  .start()
  .then((state) => {
    process.stderr.write(
      `MetaMask Mobile daemon started on port ${state.port} (bundleId: ${bundleId})\n`,
    );
  })
  .catch((error: Error) => {
    process.stderr.write(`Failed to start daemon: ${error.message}\n`);
    process.exit(1);
  });
