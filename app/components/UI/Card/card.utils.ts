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
import { FlashListAssetKey } from '../Tokens/TokenList';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import balanceScannerAbi from './balanceScannerAbi.json';
import { StyleProp, ViewStyle } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens';
import BigNumber from 'bignumber.js';

/**
 * Linea Mainnet contract addresses
 */
const BALANCE_SCANNER_CONTRACT_ADDRESS =
  '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a';
const BALANCE_SCANNER_ABI = balanceScannerAbi as ethers.ContractInterface;
const getBalanceScannerContract = (
  provider: ethers.providers.JsonRpcProvider,
) =>
  new ethers.Contract(
    BALANCE_SCANNER_CONTRACT_ADDRESS,
    BALANCE_SCANNER_ABI,
    provider,
  );
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
  rawBalance: ethers.BigNumber;
  globalAllowance: string;
  usAllowance: string;
}

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
  // set arbitrary threshold for unlimited allowance
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

    const balanceScanner = getBalanceScannerContract(provider);

    const spenders = tokenAddressesList.map(() => [
      FOXCONNECT_GLOBAL_ADDRESS,
      FOXCONNECT_US_ADDRESS,
    ]);

    const spendersAllowancesForTokens: [boolean, string][][] =
      await balanceScanner.spendersAllowancesForTokens(
        address,
        tokenAddressesList,
        spenders,
      );

    // Check if any of the allowances are non-zero
    for (const allowances of spendersAllowancesForTokens) {
      if (!allowances || allowances.length === 0) {
        continue;
      }
      const [globalAllowance, usAllowance] = allowances.map(
        (allowance) => allowance[1],
      );

      if (
        !BigNumber(globalAllowance).isZero() ||
        !BigNumber(usAllowance).isZero()
      ) {
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
    const balanceScanner = getBalanceScannerContract(provider);
    const foxIface = new ethers.utils.Interface(foxConnectAbi);
    const { defaultAbiCoder, hexZeroPad, hexlify, getAddress } = ethers.utils;

    const targets = [
      FOXCONNECT_GLOBAL_ADDRESS,
      FOXCONNECT_US_ADDRESS,
      FOXCONNECT_GLOBAL_ADDRESS,
      FOXCONNECT_US_ADDRESS,
    ];
    const payloads = [
      foxIface.encodeFunctionData('getWithdrawOperators', []),
      foxIface.encodeFunctionData('getWithdrawOperators', []),
      foxIface.encodeFunctionData('getBeneficiary', []),
      foxIface.encodeFunctionData('getBeneficiary', []),
    ];
    const [r0, r1, r2, r3] = await balanceScanner['call(address[],bytes[])'](
      targets,
      payloads,
    );
    const globalOperators = (
      defaultAbiCoder.decode(['address[]'], r0.data)[0] as string[]
    ).map((a) => a.toLowerCase());
    const usOperators = (
      defaultAbiCoder.decode(['address[]'], r1.data)[0] as string[]
    ).map((a) => a.toLowerCase());
    const globalBeneficiary = (
      defaultAbiCoder.decode(['address'], r2.data)[0] as string
    ).toLowerCase();
    const usBeneficiary = (
      defaultAbiCoder.decode(['address'], r3.data)[0] as string
    ).toLowerCase();

    if (
      globalOperators.includes(address) ||
      usOperators.includes(address) ||
      globalBeneficiary === address ||
      usBeneficiary === address
    ) {
      return true;
    }

    const fromBlock = -50000; // Check from the last 50,000 blocks

    // Fallback to log-scanning of transfers events
    for (const tokenAddress of tokenAddressesList) {
      // Check if user has sent funds to FoxConnect contracts
      const sentLogs = await provider.getLogs({
        address: tokenAddress,
        topics: [
          TRANSFER_EVENT_TOPIC,
          hexZeroPad(hexlify(address.toLowerCase()), 32),
          null,
        ],
        fromBlock,
        toBlock: 'latest',
      });
      Logger.log(`Found ${sentLogs.length} transfers from user`);
      if (
        sentLogs.some((log) => {
          const to = getAddress('0x' + log.topics[2].slice(26)).toLowerCase();
          return (
            to === FOXCONNECT_GLOBAL_ADDRESS.toLowerCase() ||
            to === FOXCONNECT_US_ADDRESS.toLowerCase() ||
            globalOperators.includes(to) ||
            usOperators.includes(to) ||
            to === globalBeneficiary ||
            to === usBeneficiary
          );
        })
      ) {
        return true;
      }

      // Check if user has received funds from FoxConnect contracts
      const receiveLogs = await provider.getLogs({
        address: tokenAddress,
        topics: [
          TRANSFER_EVENT_TOPIC,
          null,
          hexZeroPad(hexlify(address.toLowerCase()), 32),
        ],
        fromBlock,
        toBlock: 'latest',
      });
      Logger.log(`Found ${receiveLogs.length} transfers to user`);
      if (
        receiveLogs.some((log) => {
          const from = getAddress('0x' + log.topics[1].slice(26)).toLowerCase();
          return (
            from === FOXCONNECT_GLOBAL_ADDRESS.toLowerCase() ||
            from === FOXCONNECT_US_ADDRESS.toLowerCase() ||
            globalOperators.includes(from) ||
            usOperators.includes(from) ||
            from === globalBeneficiary ||
            from === usBeneficiary
          );
        })
      ) {
        return true;
      }
    }

    return false;
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
  const provider = createProvider();
  const supportedTokens = mapCardFeatureToSupportedTokens(cardFeature);

  if (!supportedTokens || supportedTokens.length === 0) {
    console.warn('No supported tokens found for the card feature');
    return {
      balanceList: [],
      totalBalanceDisplay: '0',
    };
  }

  const supportedTokensAddresses = supportedTokens.map(
    (token) => token.address as string,
  );

  const balanceScanner = getBalanceScannerContract(provider);

  try {
    const spenders = supportedTokensAddresses.map(() => [
      FOXCONNECT_GLOBAL_ADDRESS,
      FOXCONNECT_US_ADDRESS,
    ]);

    const [tokensBalance, spendersAllowancesForTokens]: [
      [boolean, string][],
      [boolean, string][][],
    ] = await Promise.all([
      balanceScanner.tokensBalance(address, supportedTokensAddresses),
      balanceScanner.spendersAllowancesForTokens(
        address,
        supportedTokensAddresses,
        spenders,
      ),
    ]);

    const mappedBalanceList = tokensBalance.map((item, index) => {
      const tokenInfo = supportedTokens[index];

      if (!tokenInfo) {
        console.warn(
          `Token info not found for index ${index}. Skipping balance.`,
        );
        return null;
      }

      const spendersAllowances = spendersAllowancesForTokens[index];
      if (!spendersAllowances || spendersAllowances.length === 0) {
        console.warn(
          `No spenders allowances found for token at index ${index}. Skipping allowance state.`,
        );
        return null;
      }

      const [globalAllowance, usAllowance] = spendersAllowances.map(
        (allowance) => allowance[1],
      );
      const allowanceState = BigNumber(usAllowance).isZero()
        ? getAllowanceState(globalAllowance)
        : getAllowanceState(usAllowance);

      const [success, hexBalance] = item;

      const rawBalance = ethers.BigNumber.from(success ? hexBalance : 0);
      return {
        address: tokenInfo.address as string,
        decimals: tokenInfo.decimals || 18,
        symbol: tokenInfo.symbol || '',
        name: tokenInfo.name || '',
        balance: renderFromTokenMinimalUnit(
          rawBalance.toString(),
          tokenInfo.decimals || 18,
        ),
        rawBalance,
        allowanceState,
        globalAllowance,
        usAllowance,
      };
    });

    const balanceList = mappedBalanceList.filter(
      (item): item is TokenConfig => item !== null,
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
    Logger.error(
      error as Error,
      `Error fetching balances with balance scanner for address ${address}`,
    );
    throw new Error(
      `Error fetching balances with balance scanner for address ${address}: ${error}`,
    );
  }
};

/**
 * Checks if the given address is a card holder
 * @param address - The Ethereum address to check
 * @param cardFeature - Optional card feature configuration
 * @param rawNetworkId - Current selected network ID
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

    if (
      !supportedNetworks.includes(networkId) ||
      !cardFeature[`eip155:${networkId}`]?.enabled
    ) {
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

const renderChip = (state: AllowanceState, colors: ThemeColors) => {
  const tagConfig: Record<
    AllowanceState,
    { label: string; style?: StyleProp<ViewStyle> }
  > = {
    [AllowanceState.Delegatable]: {
      label: 'Delegatable',
    },
    [AllowanceState.Unlimited]: {
      label: 'Enabled',
      style: { backgroundColor: colors.success.muted },
    },
    [AllowanceState.Limited]: {
      label: 'Spend Limited',
      style: { backgroundColor: colors.warning.muted },
    },
  };

  return tagConfig[state];
};

/**
 *
 * @param tokenBalances - Array of token balances to map
 * @returns FlashListAssetKey[] - Array of FlashListAssetKey objects
 */
export const mapTokenBalancesToTokenKeys = (
  tokenBalances: TokenConfig[],
  colors: ThemeColors,
): FlashListAssetKey[] =>
  tokenBalances.map((token) => ({
    address: token.address,
    chainId: LINEA_CHAIN_ID, // Assuming LINEA_CHAIN_ID is the chain ID for all tokens,
    isStaked: false,
    tag: renderChip(token.allowanceState, colors),
  }));
