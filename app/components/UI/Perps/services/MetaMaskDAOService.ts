import { BigNumber, Contract, ethers } from 'ethers';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
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
 * ERC-20 Transfer event ABI and balanceOf function for querying token transfers and balances
 */
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address owner) view returns (uint256)',
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

      // Create contract instance for event querying and balance checking
      this.contract = new Contract(
        METAMASK_DAO_CONFIG.CONTRACT_ADDRESS,
        ERC20_ABI,
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
          cacheAge:
            Math.round((now - tokenHoldersCache.timestamp) / 1000) + 's',
        });
        return isHolder;
      }

      // For individual address checks, use direct balance lookup (more efficient and accurate)
      DevLogger.log(
        'MetaMaskDAOService: Checking balance directly for address',
        {
          address: normalizedAddress,
        },
      );

      const hasTokens = await this.checkAddressBalance(address);

      // Cache individual result to avoid repeated lookups
      if (!tokenHoldersCache) {
        tokenHoldersCache = {
          holders: new Set(),
          timestamp: now,
          ttl: METAMASK_DAO_CONFIG.CACHE_DURATION_MS,
        };
      }

      if (hasTokens) {
        tokenHoldersCache.holders.add(normalizedAddress);
      }

      return hasTokens;
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
   * Check if a specific address has MMGD tokens by querying balance directly
   * @param address - The address to check
   * @returns Promise<boolean> - True if the address has a non-zero balance
   * @throws Error if contract interaction fails
   */
  private async checkAddressBalance(address: string): Promise<boolean> {
    if (!this.contract) {
      await this.initialize();
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const balance = await this.contract.balanceOf(address);
    const hasTokens = !balance.isZero();

    DevLogger.log('MetaMaskDAOService: Balance check result', {
      address,
      balance: balance.toString(),
      hasTokens,
    });

    return hasTokens;
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

      DevLogger.log(
        'MetaMaskDAOService: Querying MetaMask Grants DAO token holders',
        {
          contractAddress: METAMASK_DAO_CONFIG.CONTRACT_ADDRESS,
          deployBlock: METAMASK_DAO_CONFIG.DEPLOY_BLOCK,
        },
      );

      // Query all Transfer events from deploy block to latest
      const filter = this.contract.filters.Transfer();
      const events = await this.contract.queryFilter(
        filter,
        METAMASK_DAO_CONFIG.DEPLOY_BLOCK,
      );

      DevLogger.log('MetaMaskDAOService: Transfer events found', {
        eventsCount: events.length,
      });

      // Process transfer events to determine current holders by tracking balances
      const transfers = events.map((event) => {
        const [from, to, value] = event.args || [];
        return {
          from: from?.toLowerCase(),
          to: to?.toLowerCase(),
          value: value ? BigNumber.from(value) : BigNumber.from(0),
        };
      });

      // Calculate balances by processing all transfers
      const balances: Record<string, BigNumber> = {};

      transfers.forEach(({ from, to, value }) => {
        if (!from || !to || !value) return;

        // Initialize balances if needed
        if (!balances[from]) balances[from] = BigNumber.from(0);
        if (!balances[to]) balances[to] = BigNumber.from(0);

        // Skip minting (from zero address) and burning (to zero address) for balance calculation
        const zeroAddress = ethers.constants.AddressZero.toLowerCase();

        if (from !== zeroAddress) {
          balances[from] = balances[from].sub(value);
        }
        if (to !== zeroAddress) {
          balances[to] = balances[to].add(value);
        }
      });

      // Get addresses with positive balances
      const validHolders = Object.entries(balances)
        .filter(([address, balance]) => {
          const zeroAddress = ethers.constants.AddressZero.toLowerCase();
          return address !== zeroAddress && balance.gt(0);
        })
        .map(([address]) => address);

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
