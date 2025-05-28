import { createAnvil, Anvil as AnvilType } from '@viem/anvil';
import { createAnvilClients } from './anvil-clients';

/**
 * Represents the available Ethereum hardforks for the Anvil server
 * @typedef {('Frontier'|'Homestead'|'Dao'|'Tangerine'|'SpuriousDragon'|'Byzantium'|'Constantinople'|'Petersburg'|'Istanbul'|'Muirglacier'|'Berlin'|'London'|'ArrowGlacier'|'GrayGlacier'|'Paris'|'Shanghai'|'Latest')} Hardfork
 */
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

/**
 * Represents a hexadecimal string with '0x' prefix
 * @typedef {`0x${string}`} Hex
 */
type Hex = `0x${string}`;

/**
 * Default configuration options for the Anvil server
 * @type {Object}
 * @property {number} balance - Initial balance for each account in ETH
 * @property {number} chainId - Ethereum chain ID
 * @property {number} gasLimit - Maximum gas limit per block
 * @property {number} gasPrice - Gas price in wei
 * @property {Hardfork} hardfork - Ethereum hardfork to use
 * @property {string} host - Host address to bind the server to
 * @property {string} mnemonic - BIP39 mnemonic for deterministic account generation
 * @property {number} port - Port number to run the server on
 * @property {boolean} noMining - Whether to disable automatic mining
 */
export const defaultOptions = {
  balance: 25,
  chainId: 1337,
  gasLimit: 30000000,
  gasPrice: 2000000000,
  hardfork: 'prague' as Hardfork,
  host: '127.0.0.1',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  port: 8545,
  noMining: false,
};

/**
 * Manages an Anvil Ethereum development server instance
 * @class
 */
class AnvilManager {
  private server: AnvilType | undefined;

  /**
   * Check if the Anvil server is running
   * @returns {boolean} True if the server is running, false otherwise
   */
  isRunning(): boolean {
    return this.server !== undefined;
  }

  /**
   * Start the Anvil server with the specified options
   * @param {Object} opts - Server configuration options
   * @param {number} [opts.balance] - Initial balance for each account in ETH
   * @param {number} [opts.blockTime] - Block time in seconds
   * @param {number} [opts.chainId] - Ethereum chain ID
   * @param {number} [opts.gasLimit] - Maximum gas limit per block
   * @param {number} [opts.gasPrice] - Gas price in wei
   * @param {Hardfork} [opts.hardfork] - Ethereum hardfork to use
   * @param {string} [opts.host] - Host address to bind the server to
   * @param {string} [opts.mnemonic] - BIP39 mnemonic for deterministic account generation
   * @param {number} [opts.port] - Port number to run the server on
   * @param {boolean} [opts.noMining] - Whether to disable automatic mining
   * @throws {Error} If mnemonic is not provided
   * @throws {Error} If server fails to start
   */
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

  /**
   * Get the provider clients for interacting with the Anvil server
   * @returns {Object} Object containing wallet, public, and test clients
   * @throws {Error} If server is not running
   */
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

  /**
   * Get all accounts available on the Anvil server
   * @returns {Promise<string[]>} Array of account addresses
   */
  async getAccounts(): Promise<string[]> {
    // eslint-disable-next-line no-console
    console.log('Getting accounts...');
    const { walletClient } = this.getProvider();

    const accounts = await walletClient.getAddresses();
    // eslint-disable-next-line no-console
    console.log(`Found ${accounts.length} accounts`);
    return accounts;
  }

  /**
   * Get chain details including logs from the Anvil server
   * @returns {Promise<any>} Chain logs
   */
  async getChainDetails() {
    const { publicClient } = this.getProvider();
    const logs = await publicClient.getLogs();

    return logs;
  }

  /**
   * Set the balance for a specific account or the first account if none specified
   * @param {string} balance - Balance to set in ETH
   * @param {Hex} [address] - Optional address to set balance for
   * @throws {Error} If server is not running
   */
  async setAccountBalance(balance: string, address?: Hex): Promise<void> {
    const { testClient } = this.getProvider();
    const accounts = await this.getAccounts();

    // Determining which address to use: if address is provided and not empty, use it
    // Otherwise, use the first account from getAccounts()
    let accountAddress: Hex;
    if (address !== undefined) {
      accountAddress = address;
    } else {
      accountAddress = accounts[0] as Hex;
    }

    const weiMultiplier = BigInt('1000000000000000000'); // 10^18
    const balanceInWei = BigInt(balance) * weiMultiplier;
    await testClient.setBalance({
      address: accountAddress,
      value: balanceInWei,
    });
    // eslint-disable-next-line no-console
    console.log(`Balance set for ${accountAddress}`);
  }

  /**
   * Stop the Anvil server
   * @throws {Error} If server is not running
   * @throws {Error} If server fails to stop
   */
  async quit(): Promise<void> {
    if (!this.server) {
      throw new Error('Server not running yet');
    }
    try {
      // eslint-disable-next-line no-console
      console.log('Stopping server...');
      await this.server.stop();
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
