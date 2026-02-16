#!/usr/bin/env node
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/extensions */
import {
  createMcpServer,
  setSessionManager,
  createKnowledgeStore,
  setKnowledgeStore,
  type WorkflowContext,
} from '@metamask/client-mcp-core';
/* eslint-enable import/extensions */
/* eslint-enable import/no-nodejs-modules */

import { createMetaMaskMobileProdContext } from '../capabilities/factory';
import { MetaMaskMobileSessionManager } from './metamask-provider';

function initializeWorkflowContext(): WorkflowContext {
  return createMetaMaskMobileProdContext();
}

async function main() {
  const partialContext = initializeWorkflowContext();
  const sessionManager = new MetaMaskMobileSessionManager();
  sessionManager.setWorkflowContext(partialContext as WorkflowContext);

  setKnowledgeStore(createKnowledgeStore());
  setSessionManager(sessionManager);

  const server = createMcpServer({
    name: 'metamask-mobile',
    version: '1.0.0',
    onCleanup: async () => {
      await sessionManager.cleanup();
    },
  });

  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
