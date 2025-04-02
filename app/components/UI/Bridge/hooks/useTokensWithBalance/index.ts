import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { TokenI } from '../../../Tokens/types';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { selectLastSelectedEvmAccount, selectLastSelectedSolanaAccount } from '../../../../../selectors/accountsController';
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
import { selectMultichainTokenListForAccountId } from '../../../../../selectors/multichain';
import { selectAccountTokensAcrossChainsForAddress } from '../../../../../selectors/multichain/evm';
import { BridgeToken } from '../../types';
import { RootState } from '../../../../../reducers';
import { renderNumber, renderFiat } from '../../../../../util/number';
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
 * @returns {Array<{tokenFiatAmount: number, balance: string, balanceFiat: string}>} Array of token balances with fiat values
 * @example
 * // Returns array of objects with:
 * // tokenFiatAmount: A sortable fiat value in the user's currency, e.g. 100.12345
 * // balance: A truncated non-atomic balance, e.g. 1.23456
 * // balanceFiat: A formatted fiat value, e.g. "$100.12345", "100.12345 cad"
 */
export const calculateBalances = ({
  assets,
  multiChainMarketData,
  multiChainTokenBalance,
  networkConfigurationsByChainId,
  multiChainCurrencyRates,
  currentCurrency,
  selectedAddress,
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

    if (token.isETH || token.isNative) {
      return {
        tokenFiatAmount: parseFloat(token.balance) * multiChainConversionRate,
        balance: token.balance,
        balanceFiat: token.balanceFiat,
      };
    }

    const res = deriveBalanceFromAssetMarketDetails(
      token,
      multiChainExchangeRates || {},
      multiChainTokenBalances || {},
      multiChainConversionRate || 0,
      currentCurrency || '',
    );
    return {
      tokenFiatAmount: res.balanceFiatCalculation ?? 0, // A sortable fiat value in the user's currency, e.g. 100.12345
      balance: res.balance ?? '0', // A truncated non-atomic balance, e.g. 1.23456
      balanceFiat: res.balanceFiat, // A formatted fiat value, e.g. "$100.12345", "100.12345 cad"
    };
  });

// TODO Look into useMultichainBalances hook, or useGetFormattedTokensPerChain hook
// the above hooks don't return icon info, just balance and fiat values

/**
 * Hook to get tokens with fiat balances
 * @param {Object} params - The parameters object
 * @param {Hex[]} params.chainIds - Array of chain IDs to filter by
 * @returns {BridgeToken[]} Array of tokens (native and non-native) with sortable fiat balances
 */
export const useTokensWithBalance: ({
  chainIds,
}: {
  chainIds: (Hex | CaipChainId)[] | undefined;
}) => BridgeToken[] = ({ chainIds }) => {
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  const lastSelectedEvmAccount = useSelector(selectLastSelectedEvmAccount);
  const lastSelectedSolanaAccount = useSelector(selectLastSelectedSolanaAccount);

  // Fiat conversion rates
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);

  // All tokens across chains and their balances
  // Includes native and non-native tokens
  const accountTokensAcrossChains = useSelector((state: RootState) =>
    selectAccountTokensAcrossChainsForAddress(state, lastSelectedEvmAccount?.address),
  );
  const evmTokenBalances = useSelector(selectTokensBalances);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  // Already contains balance and fiat values
  // Balance and fiat values are not truncated
  const nonEvmTokens = useSelector((state: RootState) =>
    selectMultichainTokenListForAccountId(state, lastSelectedSolanaAccount?.id),
  );
  ///: END:ONLY_INCLUDE_IF

  const sortedTokens = useMemo(() => {
    if (!chainIds) {
      return [];
    }

    const allEvmAccountTokens = (
      Object.values(accountTokensAcrossChains).flat() as TokenI[]
    ).filter((token) => chainIds.includes(token.chainId as Hex));

    const allNonEvmAccountTokens = (
      Object.values(nonEvmTokens).flat()
    ).filter((token) => chainIds.includes(token.chainId));

    const balances = calculateBalances({
      assets: allEvmAccountTokens,
      multiChainMarketData,
      multiChainTokenBalance: evmTokenBalances,
      networkConfigurationsByChainId,
      multiChainCurrencyRates,
      currentCurrency,
      selectedAddress: lastSelectedEvmAccount?.address as Hex,
    });

    const allTokens = [
      ...allEvmAccountTokens,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      ...allNonEvmAccountTokens,
      ///: END:ONLY_INCLUDE_IF
    ];

    const properTokens: BridgeToken[] = allTokens
      .filter((token) => Boolean(token.chainId)) // Ensure token has a chainId
      .map((token, i) => {
        const evmBalance = balances?.[i]?.balance;
        const nonEvmBalance = renderNumber(token.balance ?? '0');

        const evmBalanceFiat = balances?.[i]?.balanceFiat;
        const nonEvmBalanceFiat = renderFiat(Number(token.balanceFiat ?? 0), currentCurrency);

        const evmTokenFiatAmount = balances?.[i]?.tokenFiatAmount;
        const nonEvmTokenFiatAmount = Number(token.balanceFiat);

        return ({
          address: token.address,
          name: token.name,
          decimals: token.decimals,
          symbol: token.isETH ? 'ETH' : token.symbol, // TODO: not sure why symbol is ETHEREUM, will also break the token icon for ETH
          chainId: token.chainId as Hex | CaipChainId,
          image: token.image,
          tokenFiatAmount: evmTokenFiatAmount ?? nonEvmTokenFiatAmount,
          balance: evmBalance ?? nonEvmBalance,
          balanceFiat: evmBalanceFiat ?? nonEvmBalanceFiat,
      });});
    return sortAssets(properTokens, tokenSortConfig);
  }, [
    accountTokensAcrossChains,
    multiChainMarketData,
    evmTokenBalances,
    networkConfigurationsByChainId,
    multiChainCurrencyRates,
    currentCurrency,
    tokenSortConfig,
    lastSelectedEvmAccount?.address,
    chainIds,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmTokens,
    ///: END:ONLY_INCLUDE_IF
  ]);

  return sortedTokens;
};
