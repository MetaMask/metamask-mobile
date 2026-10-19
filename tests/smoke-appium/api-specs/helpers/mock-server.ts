import type { OpenrpcDocument } from '@open-rpc/meta-schema';
import { MOCK_RPC_PORT } from './openrpc-document.js';

interface StoppableTransport {
  stop?: () => void;
}

interface OpenRpcMockServer {
  start: () => void;
  transports?: StoppableTransport[];
}

/**
 * Start `@open-rpc/mock-server` for api-specs (wallet fixture points at :8545).
 * Returns a stop handle — Server has no public stop API, so we stop transports.
 */
export function startOpenRpcMockServer(
  openrpcDocument: OpenrpcDocument,
  port: number = MOCK_RPC_PORT,
): { stop: () => void } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
  const mockServerFactory = require('@open-rpc/mock-server/build/index')
    .default as (p: number, doc: OpenrpcDocument) => OpenRpcMockServer;

  const server = mockServerFactory(port, openrpcDocument);
  server.start();

  return {
    stop: () => {
      for (const transport of server.transports ?? []) {
        try {
          // HTTPTransport (server-js) exposes stop(), not close().
          transport.stop?.();
        } catch {
          // Best-effort teardown between Playwright workers / retries.
        }
      }
    },
  };
}
