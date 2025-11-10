export type RestoreFn = () => void;

/**
 * Installs default network interceptors for integration tests:
 * - Blockaid endpoint (/solana/message/scan) returns { status: 'OK' }
 * - JSON-RPC eth_chainId, eth_getBalance, eth_call return deterministic values
 *
 * Returns a restore function that reverts global.fetch to its original implementation.
 */
export function setupIntegrationNetworkInterceptors(): RestoreFn {
  const originalFetch = (global as unknown as { fetch?: typeof fetch }).fetch;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jest.spyOn(global as any, 'fetch').mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (input: any, init?: any) => {
      try {
        const url = typeof input === 'string' ? input : input?.url;
        if (typeof url === 'string' && url.includes('/solana/message/scan')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ status: 'OK' }),
          } as Response as unknown as {
            ok: true;
            json: () => Promise<unknown>;
          });
        }

        const body =
          typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
        const { method, id } = body ?? {};
        const twoEthHex = '0x1bc16d674ec80000'; // 2 ETH

        if (method === 'eth_chainId') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: id ?? 1,
              result: '0x1',
            }),
          } as Response as unknown as {
            ok: true;
            json: () => Promise<unknown>;
          });
        }
        if (method === 'eth_getBalance') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: id ?? 1,
              result: twoEthHex,
            }),
          } as Response as unknown as {
            ok: true;
            json: () => Promise<unknown>;
          });
        }
        if (method === 'eth_call') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              jsonrpc: '2.0',
              id: id ?? 1,
              result: twoEthHex,
            }),
          } as Response as unknown as {
            ok: true;
            json: () => Promise<unknown>;
          });
        }
      } catch {
        // fall through
      }

      if (originalFetch) {
        return originalFetch(input, init);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response as unknown as {
        ok: false;
        status: number;
        json: () => Promise<unknown>;
      });
    },
  );

  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = originalFetch as typeof fetch;
  };
}
