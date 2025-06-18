/* eslint-disable no-console */
import { ethers } from 'ethers';
import Logger from '../../../util/Logger';
import { renderFromTokenMinimalUnit } from '../../../util/number';
import {
  CardFeature,
  SupportedToken,
} from '../../../selectors/featureFlagController/card';
import { getDecimalChainId } from '../../../util/networks';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

/**
 * FoxConnect contract addresses on Linea
 */
const FOXCONNECT_GLOBAL_ADDRESS = '0x9dd23A4a0845f10d65D293776B792af1131c7B30';
const FOXCONNECT_US_ADDRESS = '0xA90b298d05C2667dDC64e2A4e17111357c215dD2';

/**
 * ABI fragments for interacting with FoxConnect contracts
 */
const foxConnectAbi = [
  'function getBeneficiary() view returns (address)',
  'function getWithdrawOperators() view returns (address[])',
];

/**
 * ERC20 Token ABI for allowance checking
 */
const erc20Abi = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  Delegatable = 'delegatable',
  Unlimited = 'unlimited',
  Limited = 'limited',
}
/**
 * Transfer event topic
 */
const TRANSFER_EVENT_TOPIC = ethers.utils.id(
  'Transfer(address,address,uint256)',
);

// Cache for card holder status to avoid repeated blockchain queries
const cardHolderCache: Record<string, { status: boolean; timestamp: number }> =
  {};

// Cache expiration time (15 minutes)
const CACHE_EXPIRATION = 15 * 60 * 1000;

// Helper interface for token balances
export interface TokenConfig {
  address: string;
  contract: ethers.Contract;
  decimals: number;
  symbol: string;
  name: string;
  balance: string; // Display balance formatted for UI
  allowanceState: AllowanceState;
  rawBalance: ethers.BigNumber | string;
  globalAllowance: string;
  usAllowance: string;
}

/**
 * Get contract instances for all supported tokens
 * @param provider - Ethers provider for Linea
 * @param tokenAddressesList - List of supported token addresses
 * @returns Array of contract instances for each token
 */
const getContractsInstances = (
  provider: ethers.providers.JsonRpcProvider,
  tokenAddressesList: string[],
) =>
  Object.values(tokenAddressesList).map(
    (tokenAddresses) => new ethers.Contract(tokenAddresses, erc20Abi, provider),
  );

const createProvider = () => {
  // Try to get API key from environment, otherwise use a public RPC URL
  let provider: ethers.providers.JsonRpcProvider;
  const infuraKey = process.env.MM_INFURA_PROJECT_ID;

  if (infuraKey) {
    Logger.log('Using Infura provider');
    provider = new ethers.providers.JsonRpcProvider(
      `https://linea-mainnet.infura.io/v3/${infuraKey}`,
    );
  } else {
    Logger.log('Using public RPC provider');
    // Fallback to a public RPC if no API key is available
    provider = new ethers.providers.JsonRpcProvider(
      'https://linea-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    );
  }

  return provider;
};

/**
 * getAllowanceState - Determines the allowance state based on the allowance value
 * @param allowance - The allowance value as a string
 * @returns AllowanceState - The state of the allowance
 */
const getAllowanceState = (allowance: string): AllowanceState => {
  if (allowance === '0') {
    return AllowanceState.Delegatable;
  }
  // use BigInt for very large values
  const amount = BigInt(allowance);
  const UNLIMITED_THRESHOLD = BigInt(99999999999);

  if (amount > UNLIMITED_THRESHOLD) {
    return AllowanceState.Unlimited;
  }

  return AllowanceState.Limited;
};

export const mapCardFeatureToSupportedTokens = (
  cardFeature: CardFeature | null,
): SupportedToken[] => {
  if (!cardFeature) {
    return [];
  }

  const supportedTokens: SupportedToken[] = [];

  Object.entries(cardFeature).forEach(([_, chainData]) => {
    if (chainData?.enabled && chainData.tokens) {
      chainData.tokens.forEach((token) => {
        if (token.enabled && token.address) {
          supportedTokens.push({
            address: token.address,
            decimals: token.decimals ?? 18,
            name: token.name ?? '',
            symbol: token.symbol ?? '',
          });
        }
      });
    }
  });

  return supportedTokens;
};

/**
 * Check if the address has delegated funds to the FoxConnect contracts using allowance
 * @param address - The address to check
 * @param provider - Ethers provider for Linea
 * @param tokenAddressesList - List of supported token addresses
 * @returns Promise<boolean>
 */
const hasDelegatedFunds = async (
  address: string,
  provider: ethers.providers.JsonRpcProvider,
  tokenAddressesList: string[],
): Promise<boolean> => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    Logger.log(`Checking delegated funds for address: ${address}`);

    const contractInstances = getContractsInstances(
      provider,
      tokenAddressesList,
    );

    const allowanceChecksPromises = contractInstances.reduce(
      (acc, contract) => {
        // Check allowances for both FoxConnect contracts
        acc.push(
          contract.allowance(address, FOXCONNECT_GLOBAL_ADDRESS),
          contract.allowance(address, FOXCONNECT_US_ADDRESS),
        );
        return acc;
      },
      [] as Promise<ethers.BigNumber>[],
    );

    Logger.log(`Checking allowances for address: ${address}`);

    // Check all allowances in parallel
    const allowances = await Promise.all(
      allowanceChecksPromises.map((promise) =>
        promise.catch((error: Error) => {
          console.error('Error checking allowance:', error);
          return ethers.BigNumber.from(0);
        }),
      ),
    );

    // Check if any token has a non-zero allowance for either FoxConnect contract
    for (const allowance of allowances) {
      if (!allowance.isZero()) {
        return true;
      }
    }

    Logger.log('No active token allowances found');
    return false;
  } catch (error) {
    console.error('Error checking for delegated funds:', error);
    return false;
  }
};

/**
 * Check if the address has performed transactions with the FoxConnect contracts
 * @param address - The address to check
 * @param provider - Ethers provider for Linea
 * @param tokenAddressesList - List of supported token addresses
 * @returns Promise<boolean>
 */
const hasTransactedWithFoxConnect = async (
  address: string,
  provider: ethers.providers.JsonRpcProvider,
  tokenAddressesList: string[],
): Promise<boolean> => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    Logger.log(
      `Checking if address ${address} has transacted with FoxConnect contracts`,
    );

    // Get withdraw operators and beneficiary for both contracts
    const globalContract = new ethers.Contract(
      FOXCONNECT_GLOBAL_ADDRESS,
      foxConnectAbi,
      provider,
    );
    const usContract = new ethers.Contract(
      FOXCONNECT_US_ADDRESS,
      foxConnectAbi,
      provider,
    );

    // Get withdraw operators
    const globalWithdrawOperators = await globalContract
      .getWithdrawOperators()
      .catch(() => []);
    const usWithdrawOperators = await usContract
      .getWithdrawOperators()
      .catch(() => []);

    Logger.log(`Global withdraw operators: ${globalWithdrawOperators}`);
    Logger.log(`US withdraw operators: ${usWithdrawOperators}`);

    // Get beneficiaries
    const globalBeneficiary = await globalContract
      .getBeneficiary()
      .catch(() => '');
    const usBeneficiary = await usContract.getBeneficiary().catch(() => '');

    Logger.log(`Global beneficiary: ${globalBeneficiary}`);
    Logger.log(`US beneficiary: ${usBeneficiary}`);

    // Check if the address is a withdraw operator or beneficiary
    if (
      globalWithdrawOperators.includes(address) ||
      usWithdrawOperators.includes(address) ||
      (globalBeneficiary &&
        globalBeneficiary.toLowerCase() === address.toLowerCase()) ||
      (usBeneficiary && usBeneficiary.toLowerCase() === address.toLowerCase())
    ) {
      Logger.log(`Address ${address} is a withdraw operator or beneficiary`);
      return true;
    }

    // Check token balances directly
    const contractsInstances = getContractsInstances(
      provider,
      tokenAddressesList,
    );

    // First check if the user has any tokens (a prerequisite for transferring them)
    const balancesPromises = contractsInstances.map((contract) => {
      const balance = contract
        .balanceOf(address)
        .catch(() => ethers.BigNumber.from(0));
      return {
        contract: contract.address,
        balance,
      };
    });

    const resolvedBalances = await Promise.all(
      balancesPromises.map((promise) =>
        promise.balance.catch((error: Error) => {
          console.error('Error getting balance:', error);
          return ethers.BigNumber.from(0);
        }),
      ),
    );

    // Create a map of balances for easier access
    const balances: {
      [key: string]: ethers.BigNumber;
    } = resolvedBalances.reduce((acc, { contract, balance }) => {
      acc[contract] = balance;
      return acc;
    }, {});

    // Check if any balance is non-zero, without naming it
    const hasTokens = Object.values(balances).some(
      (balance) => !balance.isZero(),
    );

    if (!hasTokens) {
      Logger.log(
        `Address ${address} has no token balances, skipping transfer check`,
      );
      return false;
    }

    // If the user has tokens, perform a more targeted search for transfers
    // Instead of scanning a huge block range, use a filter with the specific addresses
    // We already know both the sender/receiver and the token contracts

    // Query for transfers from address to FoxConnect contracts
    // Split into separate smaller queries for better performance
    let transferFound = false;

    for (const tokenAddress of tokenAddressesList) {
      const tokenBalance = balances[tokenAddress];

      // Skip if balance is not an object or is zero
      if (!tokenBalance || typeof tokenBalance !== 'object') {
        Logger.log(
          `Skipping transfer check for ${tokenAddress} (invalid balance)`,
        );
        continue;
      }

      Logger.log(`Checking transfers for token ${tokenAddress}`);

      // Use a more targeted approach - check transfers to FoxConnect
      const fromUserToFoxconnectFilter = {
        address: tokenAddress,
        topics: [
          TRANSFER_EVENT_TOPIC,
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(address.toLowerCase()),
            32,
          ),
          null, // Any recipient
        ],
        fromBlock: -50000, // More targeted, can use smaller range
        toBlock: 'latest',
      };

      const transfersFromUser = await provider.getLogs(
        fromUserToFoxconnectFilter,
      );
      Logger.log(`Found ${transfersFromUser.length} transfers from user`);

      // Check if any of these transfers were to FoxConnect contracts
      for (const transfer of transfersFromUser) {
        if (!transfer.topics[2]) continue;

        const to = ethers.utils.getAddress('0x' + transfer.topics[2].slice(26));

        if (
          to.toLowerCase() === FOXCONNECT_GLOBAL_ADDRESS.toLowerCase() ||
          to.toLowerCase() === FOXCONNECT_US_ADDRESS.toLowerCase()
        ) {
          Logger.log(`Found transfer from ${address} to ${to}`);
          transferFound = true;
          break;
        }
      }

      if (transferFound) break;

      // Check transfers from FoxConnect to user
      const toUserFromFoxconnectFilter = {
        address: tokenAddress,
        topics: [
          TRANSFER_EVENT_TOPIC,
          null, // Any sender
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(address.toLowerCase()),
            32,
          ),
        ],
        fromBlock: -50000,
        toBlock: 'latest',
      };

      const transfersToUser = await provider.getLogs(
        toUserFromFoxconnectFilter,
      );
      Logger.log(`Found ${transfersToUser.length} transfers to user`);

      // Check if any of these transfers were from FoxConnect contracts
      for (const transfer of transfersToUser) {
        if (!transfer.topics[1]) continue;

        const from = ethers.utils.getAddress(
          '0x' + transfer.topics[1].slice(26),
        );

        if (
          from.toLowerCase() === FOXCONNECT_GLOBAL_ADDRESS.toLowerCase() ||
          from.toLowerCase() === FOXCONNECT_US_ADDRESS.toLowerCase()
        ) {
          Logger.log(`Found transfer from ${from} to ${address}`);
          transferFound = true;
          break;
        }
      }

      if (transferFound) break;
    }

    return transferFound;
  } catch (error) {
    console.error('Error checking for FoxConnect transactions:', error);
    return false;
  }
};

/**
 * Fetch balances of supported tokens on Linea
 * @param address - The address to check
 * @param tokenAddressesList - List of supported token addresses
 * @param cardFeature - The card feature configuration
 * @returns Promise<boolean>
 */
export const fetchSupportedTokensBalances = async (
  address: string,
  cardFeature: CardFeature | null,
): Promise<{
  balanceList: TokenConfig[];
  totalBalanceDisplay: string;
}> => {
  try {
    const provider = createProvider();
    const supportedTokens = mapCardFeatureToSupportedTokens(cardFeature);

    if (!supportedTokens || supportedTokens.length === 0) {
      console.warn('No supported tokens found for the card feature');
      return {
        balanceList: [],
        totalBalanceDisplay: '0',
      };
    }

    // Initialize token contracts
    const contractInstances = getContractsInstances(
      provider,
      supportedTokens.map((token) => token.address as string),
    );

    const balanceListResult = await Promise.all(
      contractInstances.map((contract) =>
        Promise.all([
          contract.balanceOf(address).catch(() => ethers.BigNumber.from(0)),
          contract
            .allowance(address, FOXCONNECT_GLOBAL_ADDRESS)
            .catch(() => ethers.BigNumber.from(0)),
          contract
            .allowance(address, FOXCONNECT_US_ADDRESS)
            .catch(() => ethers.BigNumber.from(0)),
        ]).then(([raw, globalAllowance, usAllowance]) => ({
          address: contract.address,
          raw,
          contract,
          globalAllowance,
          usAllowance,
        })),
      ),
    );

    const balanceList = balanceListResult.map(
      ({
        address: TokenAddress,
        raw,
        contract,
        globalAllowance,
        usAllowance,
      }) => {
        const tokenInfo = supportedTokens.find(
          (token) =>
            token.address?.toLowerCase() === TokenAddress.toLowerCase(),
        );

        if (!tokenInfo) {
          console.warn(
            `Token info not found for address: ${TokenAddress}. Skipping balance.`,
          );
          throw new Error(
            `Token info not found for address: ${TokenAddress}. Skipping balance.`,
          );
        }

        const { decimals, name, symbol } = tokenInfo;

        const allowance = !usAllowance?.isZero()
          ? usAllowance
          : globalAllowance;
        const allowanceState = getAllowanceState(allowance.toString());

        return {
          address: TokenAddress,
          symbol: symbol || '',
          name: name || '',
          balance: renderFromTokenMinimalUnit(raw.toString(), decimals || 18),
          rawBalance: raw,
          decimals: decimals || 18,
          contract,
          allowanceState,
          globalAllowance: globalAllowance
            ? renderFromTokenMinimalUnit(
                globalAllowance.toString(),
                decimals || 18,
              )
            : '0',
          usAllowance: usAllowance
            ? renderFromTokenMinimalUnit(usAllowance.toString(), decimals || 18)
            : '0',
        };
      },
    );

    const totalRawBalance = balanceList.reduce(
      (total, token) => total.add(token.rawBalance),
      ethers.BigNumber.from(0),
    );

    const hasNonZeroBalance = !totalRawBalance.isZero();

    // Format the total balance as a string for display with $ and 2 decimal places
    let totalBalanceDisplay = 'No tokens available';
    if (hasNonZeroBalance) {
      // Convert to a decimal number with proper decimal places
      const totalInDecimal = parseFloat(
        renderFromTokenMinimalUnit(totalRawBalance.toString(), 6),
      );
      // Format with $ and 2 decimal places
      totalBalanceDisplay = `$${totalInDecimal.toFixed(2)}`;
    }

    return {
      balanceList,
      totalBalanceDisplay,
    };
  } catch (error) {
    console.error('Error fetching token balances:', error);
    throw new Error('Failed to fetch token balances. Please try again later.');
  }
};

/**
 * Checks if the given address is a card holder
 * @param address - The Ethereum address to check
 * @param rawNetworkId - Current selected network ID
 * @param cardFeature - Optional card feature configuration
 * @returns Promise<boolean> - Whether the address is a card holder
 */
export const isCardHolder = async (
  address: string,
  cardFeature: CardFeature,
  rawNetworkId: `0x${string}` | SupportedCaipChainId,
): Promise<boolean> => {
  try {
    const supportedNetworks = Object.keys(cardFeature).map(
      (key) => key.split(':')[1],
    );
    const networkId = getDecimalChainId(rawNetworkId);

    if (!supportedNetworks.includes(networkId)) {
      Logger.log(
        `Network ID ${networkId} is not supported by card feature, skipping card check`,
      );
      return false;
    }

    const supportedTokens = cardFeature[`eip155:${networkId}`]?.tokens?.filter(
      (token) => token.enabled,
    );

    if (!supportedTokens || supportedTokens.length === 0) {
      Logger.log(
        `No supported tokens found for network ID ${networkId}, skipping card check`,
      );
      return false;
    }

    // Normalize address
    const normalizedAddress = address?.toLowerCase();

    if (!normalizedAddress) {
      Logger.log('Invalid address provided');
      return false;
    }

    Logger.log(
      `Checking if address ${normalizedAddress} is a card holder on network ${networkId}`,
    );

    // Check cache first
    const now = Date.now();
    const cacheEntry = cardHolderCache[normalizedAddress];
    if (cacheEntry && now - cacheEntry.timestamp < CACHE_EXPIRATION) {
      Logger.log(
        `Using cached result for ${normalizedAddress}: ${cacheEntry.status}`,
      );
      return cacheEntry.status;
    }

    const provider = createProvider();

    // Check provider is connected
    try {
      const network = await provider.getNetwork();
      Logger.log(`Connected to network: ${network.name} (${network.chainId})`);
    } catch (error) {
      console.error('Error connecting to provider:', error);
      return false;
    }

    // Check if the address has delegated funds to FoxConnect contracts
    Logger.log(
      'Checking if address has delegated funds to FoxConnect contracts',
    );
    const delegated = await hasDelegatedFunds(
      normalizedAddress,
      provider,
      supportedTokens.map((token) => token.address as string),
    );
    if (delegated) {
      Logger.log(
        `Address ${normalizedAddress} has delegated funds to FoxConnect contracts`,
      );
      // Update cache
      cardHolderCache[normalizedAddress] = { status: true, timestamp: now };
      return true;
    }

    // Check if the address has transacted with FoxConnect contracts
    // This is checked only if no delegated funds are found.
    // It possibly means that the user revoked the allowance.
    Logger.log('Checking if address has transacted with FoxConnect contracts');
    const transacted = await hasTransactedWithFoxConnect(
      normalizedAddress,
      provider,
      supportedTokens.map((token) => token.address as string),
    );

    Logger.log(
      `Address ${normalizedAddress} has${
        transacted ? '' : ' not'
      } transacted with FoxConnect contracts`,
    );

    // Update cache
    cardHolderCache[normalizedAddress] = { status: transacted, timestamp: now };

    return transacted;
  } catch (error) {
    console.error('Error checking if address is card holder:', error);
    return false;
  }
};
