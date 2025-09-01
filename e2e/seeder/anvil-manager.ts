/* eslint-disable import/no-nodejs-modules */
import { createAnvil, Anvil as AnvilType } from '@viem/anvil';
import { createAnvilClients } from './anvil-clients';
import { AnvilPort } from '../framework/fixtures/FixtureUtils';
import { AnvilNodeOptions } from '../framework/types';
import { createLogger } from '../framework/logger';

const logger = createLogger({
  name: 'AnvilManager',
});

export const DEFAULT_ANVIL_PORT = 8545;

/**
 * Represents the available Ethereum hardforks for the Anvil server
 * @typedef {('Frontier'|'Homestead'|'Dao'|'Tangerine'|'SpuriousDragon'|'Byzantium'|'Constantinople'|'Petersburg'|'Istanbul'|'Muirglacier'|'Berlin'|'London'|'ArrowGlacier'|'GrayGlacier'|'Paris'|'Shanghai'|'Latest')} Hardfork
 */
export type Hardfork =
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
  balance: 1000,
  chainId: 1337,
  gasLimit: 30000000,
  gasPrice: 2000000000,
  hardfork: 'prague' as Hardfork,
  host: '127.0.0.1',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  port: DEFAULT_ANVIL_PORT,
  noMining: false,
};

/**
 * Manages an Anvil Ethereum development server instance
 * @class
 */
class AnvilManager {
  private server: AnvilType | undefined;
  private serverPort: number | undefined;

  /**
   * Check if the Anvil server is running
   * @returns {boolean} True if the server is running, false otherwise
   */
  isRunning(): boolean {
    return this.server !== undefined;
  }

  // Using shared port utilities from FixtureUtils

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
  async start(opts: AnvilNodeOptions = {}): Promise<void> {
    const options = { ...defaultOptions, ...opts, port: AnvilPort() };
    const { port } = options;
    this.serverPort = port;

    try {
      logger.debug('Starting Anvil server...');

      // Create and start the server instance
      this.server = createAnvil({
        ...options,
      });

      await this.server.start();
      logger.debug(`Server started on port ${port}`);
    } catch (error) {
      logger.error('Failed to start server:', error);
      this.server = undefined;
      this.serverPort = undefined;
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
      this.server.options.port ?? AnvilPort(),
    );

    return { walletClient, publicClient, testClient };
  }

  /**
   * Get all accounts available on the Anvil server
   * @returns {Promise<string[]>} Array of account addresses
   */
  async getAccounts(): Promise<string[]> {
    logger.debug('Getting accounts...');
    const { walletClient } = this.getProvider();

    const accounts = await walletClient.getAddresses();
    logger.debug(`Found ${accounts.length} accounts`);
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
    logger.debug(`Anvil server balance set for ${accountAddress}`);
  }

  /**
   * Stop the Anvil server
   * @throws {Error} If server is not running
   * @throws {Error} If server fails to stop
   */
  async quit(): Promise<void> {
    if (!this.server) {
      logger.debug('Anvil server not running in this instance.');
      return;
    }

    try {
      const port = this.serverPort || AnvilPort();
      logger.debug(`Stopping Anvil server on port ${port}...`);
      await this.server.stop();
      logger.debug(`Anvil server stopped on port ${port}`);
    } catch (e) {
      logger.error(`Error stopping server: ${e}`);
      throw e;
    } finally {
      this.server = undefined;
      this.serverPort = undefined;
    }
  }
}
export { AnvilManager };
