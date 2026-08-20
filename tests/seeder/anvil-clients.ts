import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
} from 'viem';
import { anvil as baseAnvil } from 'viem/chains';
export interface CreateAnvilClientsOptions {
  /**
   * HTTP request timeout in ms for Anvil RPC calls.
   * Forked Aave/mainnet txs can exceed viem's default (~10s) while Anvil
   * cold-loads storage from Infura.
   */
  timeout?: number;
}

/**
 * Creates a set of clients for interacting with an Anvil test node
 * @param {number} chainId - The chain ID for the network
 * @param {number} port - The port number where the Anvil node is running
 * @param options - Optional client configuration (e.g. longer RPC timeout)
 * @returns {Object} An object containing three clients:
 * - publicClient: For reading blockchain data
 * - testClient: For testing and development operations
 * - walletClient: For wallet operations and signing transactions
 */
function createAnvilClients(
  chainId: number,
  port: number,
  options: CreateAnvilClientsOptions = {},
) {
  const anvil = {
    ...baseAnvil,
    id: chainId,
    rpcUrls: {
      default: {
        http: [`http://localhost:${port}`],
      },
    },
  };

  const transport = http(`http://localhost:${port}`, {
    timeout: options.timeout,
  });

  const publicClient = createPublicClient({
    chain: anvil,
    transport,
  });

  const testClient = createTestClient({
    chain: anvil,
    mode: 'anvil',
    transport,
  });

  const walletClient = createWalletClient({
    chain: anvil,
    transport,
  });

  return { publicClient, testClient, walletClient };
}

export { createAnvilClients };
