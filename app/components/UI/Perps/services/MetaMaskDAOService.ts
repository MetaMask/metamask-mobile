import { BigNumber, Contract, ethers } from 'ethers';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';

/**
 * MetaMask Grants DAO configuration
 */
export const METAMASK_DAO_CONFIG = {
  // MetaMask Grants DAO Token (MMGD) contract address
  CONTRACT_ADDRESS: '0x2C9051820EF310D168937d9768AFD05370bb35eE',
  // Chain ID where the token exists (Ethereum mainnet)
  CHAIN_ID: '0x1',
  // Block number when the contract was deployed
  DEPLOY_BLOCK: 18500000, // Approximate block number - should be updated with actual deploy block
  // Cache duration for token holders list
  CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * ERC-20 Transfer event ABI for querying token transfers
 */
const TRANSFER_EVENT_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

/**
 * Cache for token holders to avoid repeated blockchain queries
 */
interface TokenHoldersCache {
  holders: Set<string>;
  timestamp: number;
  ttl: number;
}

let tokenHoldersCache: TokenHoldersCache | null = null;

/**
 * Service to manage MetaMask Grants DAO token holder verification
 * for fee bypass functionality
 */
export class MetaMaskDAOService {
  private contract: Contract | null = null;
  private isInitialized = false;

  /**
   * Initialize the service with Web3 provider
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      DevLogger.log('MetaMaskDAOService: Initializing service');
      
      // Get Web3 provider for Ethereum mainnet
      const provider = getProviderByChainId(METAMASK_DAO_CONFIG.CHAIN_ID);
      if (!provider) {
        throw new Error('Unable to get Web3 provider for Ethereum mainnet');
      }

      // Create contract instance for event querying
      this.contract = new Contract(
        METAMASK_DAO_CONFIG.CONTRACT_ADDRESS,
        TRANSFER_EVENT_ABI,
        provider,
      );

      this.isInitialized = true;
      DevLogger.log('MetaMaskDAOService: Service initialized successfully');
    } catch (error) {
      DevLogger.log('MetaMaskDAOService: Failed to initialize', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if an address is a MetaMask Grants DAO token holder
   * @param address - The address to check (will be normalized to lowercase)
   * @returns Promise<boolean> - True if the address holds MMGD tokens
   */
  async isTokenHolder(address: string): Promise<boolean> {
    try {
      if (!address) {
        return false;
      }

      // Normalize address to lowercase for consistent comparison
      const normalizedAddress = address.toLowerCase();

      // Check cache first
      const now = Date.now();
      if (
        tokenHoldersCache &&
        now - tokenHoldersCache.timestamp < tokenHoldersCache.ttl
      ) {
        const isHolder = tokenHoldersCache.holders.has(normalizedAddress);
        DevLogger.log('MetaMaskDAOService: Using cached token holder status', {
          address: normalizedAddress,
          isHolder,
          cacheAge: Math.round((now - tokenHoldersCache.timestamp) / 1000) + 's',
        });
        return isHolder;
      }

      // Cache miss or expired - fetch fresh data
      DevLogger.log('MetaMaskDAOService: Cache miss, fetching token holders');
      await this.fetchTokenHolders();

      // Check again after refresh
      return tokenHoldersCache?.holders.has(normalizedAddress) ?? false;
    } catch (error) {
      DevLogger.log('MetaMaskDAOService: Error checking token holder status', {
        error: error instanceof Error ? error.message : String(error),
        address,
      });
      // Return false on error to avoid blocking trades
      return false;
    }
  }

  /**
   * Fetch all token holders by analyzing Transfer events
   * This is based on the backend implementation provided in the pseudo-code
   */
  private async fetchTokenHolders(): Promise<void> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      DevLogger.log('MetaMaskDAOService: Querying MetaMask Grants DAO token holders', {
        contractAddress: METAMASK_DAO_CONFIG.CONTRACT_ADDRESS,
        deployBlock: METAMASK_DAO_CONFIG.DEPLOY_BLOCK,
      });

      // Query all Transfer events from deploy block to latest
      const filter = this.contract.filters.Transfer();
      const events = await this.contract.queryFilter(
        filter,
        METAMASK_DAO_CONFIG.DEPLOY_BLOCK,
      );

      DevLogger.log('MetaMaskDAOService: Transfer events found', {
        eventsCount: events.length,
      });

      // Process transfer events to determine current holders
      const transfers = events.map((event) => {
        const [from, to] = event.args || [];
        return { from: from?.toLowerCase(), to: to?.toLowerCase() };
      });

      // Build holders list by processing all transfers
      const holdersArray = transfers.reduce((acc: string[], transfer) => {
        const { from, to } = transfer;

        if (!from || !to) {
          return acc;
        }

        // If transferring FROM a current holder, remove them (tokens were burned/sold)
        const fromIndex = acc.indexOf(from);
        if (fromIndex >= 0) {
          acc.splice(fromIndex, 1);
        }

        // Add the recipient to holders list if not already present
        if (acc.indexOf(to) === -1) {
          acc.push(to);
        }

        return acc;
      }, []);

      // Filter out zero address (burn address)
      const validHolders = holdersArray.filter(
        (address) => address !== ethers.constants.AddressZero.toLowerCase(),
      );

      // Update cache
      tokenHoldersCache = {
        holders: new Set(validHolders),
        timestamp: Date.now(),
        ttl: METAMASK_DAO_CONFIG.CACHE_DURATION_MS,
      };

      DevLogger.log('MetaMaskDAOService: Token holders cache updated', {
        holdersCount: validHolders.length,
        cacheExpiry: new Date(
          Date.now() + METAMASK_DAO_CONFIG.CACHE_DURATION_MS,
        ).toISOString(),
      });
    } catch (error) {
      DevLogger.log('MetaMaskDAOService: Error fetching token holders', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clear the token holders cache
   * Useful when switching accounts or when cache needs to be refreshed
   */
  clearCache(): void {
    tokenHoldersCache = null;
    DevLogger.log('MetaMaskDAOService: Cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    isCached: boolean;
    holdersCount: number;
    cacheAge: number;
    cacheExpiry: string | null;
  } {
    if (!tokenHoldersCache) {
      return {
        isCached: false,
        holdersCount: 0,
        cacheAge: 0,
        cacheExpiry: null,
      };
    }

    const now = Date.now();
    return {
      isCached: true,
      holdersCount: tokenHoldersCache.holders.size,
      cacheAge: Math.round((now - tokenHoldersCache.timestamp) / 1000),
      cacheExpiry: new Date(
        tokenHoldersCache.timestamp + tokenHoldersCache.ttl,
      ).toISOString(),
    };
  }
}

/**
 * Singleton instance of MetaMaskDAOService
 */
export const metamaskDAOService = new MetaMaskDAOService();