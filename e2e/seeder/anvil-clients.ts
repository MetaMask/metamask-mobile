import {
    createPublicClient,
    createTestClient,
    createWalletClient,
    http,
  } from 'viem';
  import { anvil as baseAnvil } from 'viem/chains';


  function createAnvilClients(chainId: number, port: number) {
    const anvil = {
      ...baseAnvil,
      chainId,
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
  