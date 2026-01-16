/* eslint-disable import/no-nodejs-modules */
import { createAnvil, Anvil as AnvilType } from '@viem/anvil';
import fs from 'fs';
import path from 'path';
import { createAnvilClients } from './anvil-clients';
import { AnvilPort } from '../framework/fixtures/FixtureUtils';
import { AnvilNodeOptions, ServerStatus, Resource } from '../framework/types';
import { createLogger } from '../framework/logger';
import PortManager, { ResourceType } from '../framework/PortManager';
import { Block } from 'viem';

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
class AnvilManager implements Resource {
  private server: AnvilType | undefined;
  private serverPort: number | undefined;
  private anvilBinary: string | undefined;
  private startOptions: AnvilNodeOptions = {};
  serverStatus: ServerStatus = ServerStatus.STOPPED;

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
  setServerPort(port: number): void {
    this.serverPort = port;
  }

  /**
   * Set start options that will be used when start() is called
   * @param opts - Anvil node options
   */
  setStartOptions(opts: AnvilNodeOptions): void {
    this.startOptions = opts;
  }

  async start(opts: AnvilNodeOptions = {}): Promise<void> {
    // Resolve local anvil binary if available; fallback to system PATH
    const localAnvil = path.resolve(
      process.cwd(),
      'node_modules',
      '.bin',
      'anvil',
    );
    this.anvilBinary = fs.existsSync(localAnvil) ? localAnvil : 'anvil';

    // Use stored options if no options provided, otherwise use provided opts
    const optsToUse = Object.keys(opts).length > 0 ? opts : this.startOptions;
    const options = { ...defaultOptions, ...optsToUse, port: this.serverPort };

    logger.debug(`Starting Anvil server on port ${this.serverPort}...`);

    // Create and start the server instance
    this.server = createAnvil({
      ...options,
      anvilBinary: this.anvilBinary,
      startTimeout: 20_000,
    });

    await this.server.start();
    logger.debug(`Server started successfully on port ${this.serverPort}`);
    this.serverStatus = ServerStatus.STARTED;
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
      this.serverPort ?? this.server.options.port ?? AnvilPort(),
    );

    return { walletClient, publicClient, testClient };
  }

  /**
   * Returns the port the Anvil server is listening on (if started).
   */
  getPort(): number | undefined {
    return this.serverPort;
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
   * Get latest block number
   * @returns {Promise<bigint>} Latest block number
   */
  async getLatestBlockNumber(): Promise<bigint> {
    logger.debug('Getting latest block number...');
    const { publicClient } = this.getProvider();
    const blockNumber = await publicClient.getBlockNumber();
    logger.debug(`Latest block number: ${blockNumber}`);
    return blockNumber;
  }

  /**
   * Get block by number
   * @param {bigint} blockNumber - Block number
   * @returns {Promise<Block | undefined>} Block
   */
  async getBlockByNumber(blockNumber: bigint): Promise<Block | undefined> {
    logger.debug(`Getting block by number: ${blockNumber}`);
    const { publicClient } = this.getProvider();
    const block = await publicClient.getBlock({ blockNumber });
    logger.debug(`Got block with ${block.transactions.length} transaction(s)`);
    return block;
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
  async stop(): Promise<void> {
    if (this.serverStatus !== ServerStatus.STARTED) {
      logger.debug('Anvil server not running in this instance.');
      this.serverStatus = ServerStatus.STOPPED;
      return;
    }

    try {
      const port = this.serverPort || AnvilPort();
      logger.debug(`Stopping Anvil server on port ${port}...`);
      await this.server?.stop();
      logger.debug(`Anvil server stopped on port ${port}`);
      this.serverStatus = ServerStatus.STOPPED;
      // Release the port after server is stopped
      if (this.serverPort !== undefined) {
        PortManager.getInstance().releasePort(ResourceType.ANVIL);
      }
    } catch (e) {
      logger.error(`Error stopping server: ${e}`);
      throw e;
    } finally {
      this.server = undefined;
      this.serverPort = undefined;
    }
  }

  /**
   * Check if the Anvil server is running
   * @returns {boolean} True if the server is running, false otherwise
   */
  isStarted(): boolean {
    return this.serverStatus === ServerStatus.STARTED;
  }

  getServerPort(): number {
    return this.serverPort ?? 0;
  }

  getServerStatus(): ServerStatus {
    return this.serverStatus;
  }
}
export { AnvilManager };
