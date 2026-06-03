import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipChainId,
} from '@metamask/utils';
import { TokenI } from '../../../Tokens/types';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import {
  deriveBalanceFromAssetMarketDetails,
  sortAssets,
} from '../../../Tokens/util';
import { selectTokenSortConfig } from '../../../../../selectors/preferencesController';
import { selectAccountTokensAcrossChainsForAddress } from '../../../../../selectors/multichain/evm';
import { BridgeToken } from '../../types';
import { RootState } from '../../../../../reducers';
import { renderNumber } from '../../../../../util/number';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n from '../../../../../../locales/i18n';
import { formatUnits } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import { toChecksumAddress } from '../../../../../util/address';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { EthScope } from '@metamask/keyring-api';
import { useNonEvmTokensWithBalance } from '../useNonEvmTokensWithBalance';
import { getTokenIconUrl } from '../../utils';
import { toHex } from '@metamask/controller-utils';
import {
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { isTradableToken } from '../../utils/isTradableToken';
import { normalizeTokenAddress } from '../../utils/tokenUtils';
import {
  useTokensData,
  isRwaChecked,
  getCheckedRwaData,
} from '../../../../hooks/useTokensData/useTokensData';

interface CalculateFiatBalancesParams {
  assets: TokenI[];
  multiChainMarketData: ReturnType<typeof selectTokenMarketData>;
  multiChainTokenBalance: ReturnType<typeof selectTokensBalances>;
  networkConfigurationsByChainId: ReturnType<
    typeof selectNetworkConfigurations
  >;
  multiChainCurrencyRates: ReturnType<typeof selectCurrencyRates>;
  currentCurrency: string;
  selectedAddress: Hex;
  evmAccountsByChainId: ReturnType<typeof selectAccountsByChainId>;
}

function hasNonZeroBalance(token: BridgeToken) {
  return Number(token.balance ?? 0) > 0;
}

/**
 * Calculate the fiat value of tokens and their balances
 * Originally rom app/components/UI/Tokens/index.tsx
 * @param {Object} params - The parameters object
 * @param {TokenI[]} params.assets - Array of tokens to calculate balances for
 * @param {Object} params.multiChainMarketData - Market data for tokens across chains
 * @param {Object} params.multiChainTokenBalance - Token balances across chains
 * @param {Object} params.networkConfigurationsByChainId - Network configurations by chain ID
 * @param {Object} params.multiChainCurrencyRates - Currency conversion rates across chains
 * @param {string} params.currentCurrency - Current currency code
 * @param {Hex} params.selectedAddress - Selected account address
 * @param {Object} params.evmAccountsByChainId - EVM native token balances in atomic hex amount
 * @returns {Array<{tokenFiatAmount: number, balance: string, balanceFiat: string}>} Array of token balances with fiat values
 * @example
 * // Returns array of objects with:
 * // tokenFiatAmount: A sortable fiat value in the user's currency, e.g. 100.12345
 * // balance: A truncated non-atomic balance, e.g. 1.23456
 * // balanceFiat: A formatted fiat value, e.g. "$100.12345", "100.12345 cad"
 */
export const calculateEvmBalances = ({
  assets,
  multiChainMarketData,
  multiChainTokenBalance,
  networkConfigurationsByChainId,
  multiChainCurrencyRates,
  currentCurrency,
  selectedAddress,
  evmAccountsByChainId,
}: CalculateFiatBalancesParams): {
  tokenFiatAmount: number;
  balance: string;
  balanceFiat?: string;
}[] =>
  assets.map((token) => {
    const chainId = token.chainId as Hex;
    const multiChainExchangeRates = multiChainMarketData?.[chainId];
    const multiChainTokenBalances =
      multiChainTokenBalance?.[selectedAddress]?.[chainId];
    const nativeCurrency =
      networkConfigurationsByChainId[chainId].nativeCurrency;
    const multiChainConversionRate =
      multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

    // Native EVM token
    if (token.isETH || token.isNative) {
      const nativeTokenBalanceAtomicHex =
        evmAccountsByChainId?.[chainId]?.[toChecksumAddress(selectedAddress)]
          ?.balance || '0x0';
      const nativeTokenBalance = formatUnits(
        BigNumber.from(nativeTokenBalanceAtomicHex),
        token.decimals,
      );
      const tokenFiatAmount =
        Number(nativeTokenBalance) * multiChainConversionRate;
      return {
        tokenFiatAmount,
        // Don't use TokenI.balance as it could be "< 0.00001" for small amounts
        balance: nativeTokenBalance,
        balanceFiat: token.balanceFiat,
      };
    }

    // ERC20 tokens
    const res = deriveBalanceFromAssetMarketDetails(
      token,
      multiChainExchangeRates || {},
      multiChainTokenBalances || {},
      multiChainConversionRate || 0,
      currentCurrency || '',
    );
    const erc20BalanceAtomicHex =
      multiChainTokenBalances?.[token.address as Hex] ||
      multiChainTokenBalances?.[toChecksumAddress(token.address as Hex)] ||
      '0x0';

    const erc20Balance = formatUnits(
      BigNumber.from(erc20BalanceAtomicHex),
      token.decimals,
    );

    return {
      tokenFiatAmount: res.balanceFiatCalculation ?? 0, // A sortable fiat value in the user's currency, e.g. 100.12345
      // Don't use res.balance as it could be "< 0.00001" for small amounts
      balance: erc20Balance ?? '0', // A non-atomic balance, e.g. 1.23456, non-truncated
      balanceFiat: res.balanceFiat, // A formatted fiat value, e.g. "$100.12345", "100.12345 cad"
    };
  });

/**
 * Hook to get tokens with fiat balances
 * TODO refactor to use selectAssetsBySelectedAccountGroup or selectSortedAssetsBySelectedAccountGroup (BIP44 only and it does pretty much everything for you, fiat value, etc) and also use Asset type
 * @param {Object} params - The parameters object
 * @param {Hex[]} params.chainIds - Array of chain IDs to filter by
 * @param {Object} options - Optional hook configuration
 * @param {boolean} options.shouldFetchTokenData - Whether to fetch and merge token metadata
 * @returns tokens with sortable fiat balances and RWA loading state.
 */
export const useTokensWithBalance = (
  {
    chainIds,
  }: {
    chainIds: (Hex | CaipChainId)[] | undefined;
  },
  options: {
    shouldFetchTokenData?: boolean;
  } = {},
): { tokens: BridgeToken[]; isRwaDataLoading: boolean } => {
  const { shouldFetchTokenData = false } = options;
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  const selectedAccountGroupInternalAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const evmAddress = selectedAccountGroupInternalAccounts.find((account) =>
    account.scopes.includes(EthScope.Eoa),
  )?.address;

  // Fiat conversion rates
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);

  // All EVM tokens across chains and their balances
  // Includes native and non-native ERC20 tokens in TokenI format, i.e. balance is possibly to be "< 0.00001"
  const evmAccountTokensAcrossChains = useSelector((state: RootState) =>
    selectAccountTokensAcrossChainsForAddress(state, evmAddress),
  );
  // EVM native token balances in atomic hex amount
  const evmAccountsByChainId = useSelector(selectAccountsByChainId);
  // EVM non-native token balances in atomic hex amount
  const evmTokenBalances = useSelector(selectTokensBalances);

  // Already contains balance and fiat values for native SOL and SPL tokens
  // Balance and fiat values are not truncated
  const nonEvmTokens = useNonEvmTokensWithBalance();

  const sortedTokens = useMemo(() => {
    if (!chainIds) {
      return [];
    }

    // Convert CAIP chain IDs to Hex for EVM chains
    const evmChainIds = chainIds.reduce((acc, chainId) => {
      if (isCaipChainId(chainId)) {
        const { namespace, reference } = parseCaipChainId(chainId);
        if (namespace === 'eip155') {
          return [...acc, toHex(reference)];
        }
      }
      return [...acc, chainId as Hex];
    }, [] as Hex[]);

    const allEvmAccountTokens = (
      Object.values(evmAccountTokensAcrossChains).flat() as TokenI[]
    )
      .filter((token) => evmChainIds.includes(token.chainId as Hex))
      .filter((token) => !token.isStaked);

    const allNonEvmAccountTokens = Object.values(nonEvmTokens)
      .flat()
      .filter((token) => chainIds.includes(token.chainId));

    const evmBalances = calculateEvmBalances({
      assets: allEvmAccountTokens,
      multiChainMarketData,
      multiChainTokenBalance: evmTokenBalances,
      networkConfigurationsByChainId,
      multiChainCurrencyRates,
      currentCurrency,
      selectedAddress: evmAddress as Hex,
      evmAccountsByChainId,
    });

    const allTokens = [...allEvmAccountTokens, ...allNonEvmAccountTokens];

    const properTokens: BridgeToken[] = allTokens
      .filter((token) => Boolean(token.chainId) && isTradableToken(token)) // Ensure token has a chainId and is tradable
      .map((token, i) => {
        const evmBalance = evmBalances?.[i]?.balance;
        const nonEvmBalance = renderNumber(token.balance ?? '0');
        const chainId = token.chainId as Hex | CaipChainId;

        const evmTokenFiatAmount = evmBalances?.[i]?.tokenFiatAmount;
        const nonEvmTokenFiatAmount = Number(token.balanceFiat);
        const tokenFiatAmount = evmTokenFiatAmount ?? nonEvmTokenFiatAmount;

        // Use formatWithThreshold for consistent decimal formatting across all currencies
        // Matches the formatting used by the main asset list (assets-list.ts)
        const balanceFiat = formatWithThreshold(
          tokenFiatAmount ?? 0,
          0.01,
          I18n.locale,
          {
            style: 'currency',
            currency: currentCurrency,
          },
        );

        // Safely get token icon URL - formatAddressToAssetId may throw for unsupported chains
        let tokenImage = token.image;
        try {
          const assetId = formatAddressToAssetId(token.address, chainId);
          if (assetId) {
            tokenImage =
              getTokenIconUrl(assetId, isNonEvmChainId(chainId)) || token.image;
          }
        } catch (error) {
          // formatAddressToAssetId can throw for chains not supported by XChain Swaps
          // (e.g., Linea Sepolia, Hyperliquid). Fall back to token.image
          tokenImage = token.image;
        }

        return {
          address: normalizeTokenAddress(token.address, chainId),
          name: token.name,
          decimals: token.decimals,
          symbol: token.isETH ? 'ETH' : token.symbol, // TODO: not sure why symbol is ETHEREUM, will also break the token icon for ETH
          chainId,
          image: tokenImage,
          tokenFiatAmount,
          balance: evmBalance ?? nonEvmBalance,
          balanceFiat,
          accountType: token.accountType,
          aggregators: token.aggregators ?? [],
          metadata: ('metadata' in token
            ? token.metadata
            : undefined) as BridgeToken['metadata'],
          rwaData: ('rwaData' in token
            ? token.rwaData
            : undefined) as BridgeToken['rwaData'],
        };
      });
    const tokensWithPositiveBalance = properTokens.filter(hasNonZeroBalance);

    return sortAssets(tokensWithPositiveBalance, tokenSortConfig);
  }, [
    evmAccountTokensAcrossChains,
    multiChainMarketData,
    evmTokenBalances,
    networkConfigurationsByChainId,
    multiChainCurrencyRates,
    currentCurrency,
    tokenSortConfig,
    evmAddress,
    chainIds,
    evmAccountsByChainId,
    nonEvmTokens,
  ]);

  // Tokens without rwaData from Redux that haven't been confirmed via the API
  // cache yet. isRwaChecked reads the module-level tokenCache, so confirmed
  // tokens are excluded on each recomputation when sortedTokens changes.
  //
  // Deps are intentionally [sortedTokens] only (not apiTokenData). apiTokenData
  // is a forward reference here, and depending on it would create a cycle.
  // It is not needed: isRwaChecked reads the cache directly, so confirmed IDs
  // drop out on the next sortedTokens change. The list may not shrink to []
  // within a stable sortedTokens, but that is harmless — the excluded IDs are
  // cache hits and never trigger a re-fetch.
  const missingRwaAssetIds = useMemo(
    () =>
      shouldFetchTokenData
        ? sortedTokens
            .filter((token) => !token.rwaData)
            .map((token) => {
              try {
                const assetId = formatAddressToAssetId(
                  token.address,
                  token.chainId,
                );
                return assetId ? assetId.toLowerCase() : null;
              } catch {
                return null;
              }
            })
            .filter(
              (assetId): assetId is string =>
                assetId !== null && !isRwaChecked(assetId),
            )
        : [],
    [shouldFetchTokenData, sortedTokens],
  );

  // apiTokenData is consumed only as a memo trigger: it changes identity when a
  // fetch resolves, forcing the merge below to re-run. rwaData itself is read
  // from the persistent module-level cache (getCheckedRwaData), not from this
  // per-instance map — otherwise confirmed RWAs excluded from the fetch would
  // lose their rwaData on remount.
  // TODO: Migrate away from calling the token API directly once the Assets team
  // persists rwaData in controller state.
  const { tokens: apiTokenData, isLoading: isRwaDataLoading } = useTokensData(
    missingRwaAssetIds,
    { includeRwaData: true },
  );

  return useMemo(
    () => ({
      tokens: shouldFetchTokenData
        ? sortedTokens.map((token) => {
            if (token.rwaData) return token;
            try {
              const assetId = formatAddressToAssetId(
                token.address,
                token.chainId,
              );
              const normalizedAssetId = assetId?.toLowerCase();
              const cachedRwaData = normalizedAssetId
                ? (apiTokenData[normalizedAssetId]?.rwaData ??
                  getCheckedRwaData(normalizedAssetId))
                : undefined;
              return cachedRwaData
                ? { ...token, rwaData: cachedRwaData }
                : token;
            } catch {
              return token;
            }
          })
        : sortedTokens,
      isRwaDataLoading: shouldFetchTokenData ? isRwaDataLoading : false,
    }),
    [shouldFetchTokenData, sortedTokens, apiTokenData, isRwaDataLoading],
  );
};
