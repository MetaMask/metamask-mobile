import { createAnvil, Anvil as AnvilType } from '@viem/anvil';
import { createAnvilClients } from './anvil-clients';

type Hardfork =
  | 'Frontier'
  | 'Homestead'
  | 'Dao'
  | 'Tangerine'
  | 'SpuriousDragon'
  | 'Byzantium'
  | 'Constantinople'
  | 'Petersburg'
  | 'Istanbul'
  | 'Muirglacier'
  | 'Berlin'
  | 'London'
  | 'ArrowGlacier'
  | 'GrayGlacier'
  | 'Paris'
  | 'Shanghai'
  | 'Latest';

type Hex = `0x${string}`;

export const defaultOptions = {
  balance: 25,
  chainId: 1337,
  gasLimit: 30000000,
  gasPrice: 2000000000,
  hardfork: 'Muirglacier' as Hardfork,
  host: '127.0.0.1',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  port: 8545,
  noMining: false,
};

class AnvilManager {
  private server: AnvilType | undefined;

  /**
   * Check if the Anvil server is running
   * @returns {boolean} True if the server is running, false otherwise
   */
  isRunning(): boolean {
    return this.server !== undefined;
  }

  async start(
    opts: {
      balance?: number;
      blockTime?: number;
      chainId?: number;
      gasLimit?: number;
      gasPrice?: number;
      hardfork?: Hardfork;
      host?: string;
      mnemonic?: string;
      port?: number;
      noMining?: boolean;
    } = {},
  ): Promise<void> {
    if (!opts.mnemonic) {
      throw new Error('Missing required mnemonic');
    }

    const options = { ...defaultOptions, ...opts };
    const { port } = options;

    try {
      // eslint-disable-next-line no-console
      console.log('Starting Anvil server...');

      // Create and start the server instance
      this.server = createAnvil({
        ...options,
      });

      await this.server.start();
      // eslint-disable-next-line no-console
      console.log(`Server started on port ${port}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  getProvider() {
    if (!this.server) {
      throw new Error('Server not running yet');
    }
    const { walletClient, publicClient, testClient } = createAnvilClients(
      this.server.options.chainId ?? 1337,
      this.server.options.port ?? 8545,
    );

    return { walletClient, publicClient, testClient };
  }

  async getAccounts(): Promise<string[]> {
    // eslint-disable-next-line no-console
    console.log('Getting accounts...');
    const { walletClient } = this.getProvider();

    const accounts = await walletClient.getAddresses();
    // eslint-disable-next-line no-console
    console.log(`Found ${accounts.length} accounts`);
    return accounts;
  }
  async getChainDetails() {
    const { publicClient } = this.getProvider();
    const logs = await publicClient.getLogs();

    return logs;
  }

  async setAccountBalance(balance: string): Promise<void> {
    // eslint-disable-next-line no-console
    // console.log(`Setting balance for ${address} to ${balance} ETH`);
    const { testClient } = this.getProvider();
    const accounts = await this.getAccounts();
    const account = accounts[0] as Hex;
    const balanceInWei = BigInt(balance) * BigInt(10) ** BigInt(18);
    await testClient.setBalance({
      address: account,
      value: balanceInWei,
    });
    // eslint-disable-next-line no-console
    console.log(`Balance set for ${account}`);
  }

  async quit(): Promise<void> {
    if (!this.server) {
      throw new Error('Server not running yet');
    }
    try {
      // eslint-disable-next-line no-console
      console.log('Stopping server...');
      await this.server.stop();
      this.server = undefined;
      // eslint-disable-next-line no-console
      console.log('Server stopped');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Error stopping server: ${e}`);
      throw e;
    }
  }
}
export { AnvilManager };
