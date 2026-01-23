import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
} from 'viem';
import { anvil as baseAnvil } from 'viem/chains';
/**
 * Creates a set of clients for interacting with an Anvil test node
 * @param {number} chainId - The chain ID for the network
 * @param {number} port - The port number where the Anvil node is running
 * @returns {Object} An object containing three clients:
 * - publicClient: For reading blockchain data
 * - testClient: For testing and development operations
 * - walletClient: For wallet operations and signing transactions
 */
function createAnvilClients(chainId: number, port: number) {
  const anvil = {
    ...baseAnvil,
    id: chainId,
    rpcUrls: {
      default: {
        http: [`http://localhost:${port}`],
      },
    },
  };

  const publicClient = createPublicClient({
    chain: anvil,
    transport: http(`http://localhost:${port}`),
  });

  const testClient = createTestClient({
    chain: anvil,
    mode: 'anvil',
    transport: http(`http://localhost:${port}`),
  });

  const walletClient = createWalletClient({
    chain: anvil,
    transport: http(`http://localhost:${port}`),
  });

  return { publicClient, testClient, walletClient };
}

export { createAnvilClients };
