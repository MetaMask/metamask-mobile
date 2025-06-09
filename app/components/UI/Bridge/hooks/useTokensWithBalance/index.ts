import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, getChecksumAddress, Hex } from '@metamask/utils';
import { TokenI } from '../../../Tokens/types';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import {
  selectLastSelectedEvmAccount,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectLastSelectedSolanaAccount,
  ///: END:ONLY_INCLUDE_IF
} from '../../../../../selectors/accountsController';
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
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainTokenListForAccountId } from '../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
import { selectAccountTokensAcrossChainsForAddress } from '../../../../../selectors/multichain/evm';
import { BridgeToken } from '../../types';
import { RootState } from '../../../../../reducers';
import { renderNumber, renderFiat } from '../../../../../util/number';
import { formatUnits } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';

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
        evmAccountsByChainId?.[chainId]?.[getChecksumAddress(selectedAddress)]
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
      multiChainTokenBalances?.[getChecksumAddress(token.address as Hex)] ||
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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const lastSelectedSolanaAccount = useSelector(
    selectLastSelectedSolanaAccount,
  );
  ///: END:ONLY_INCLUDE_IF

  // Fiat conversion rates
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);

  // All EVM tokens across chains and their balances
  // Includes native and non-native ERC20 tokens in TokenI format, i.e. balance is possibly to be "< 0.00001"
  const evmAccountTokensAcrossChains = useSelector((state: RootState) =>
    selectAccountTokensAcrossChainsForAddress(
      state,
      lastSelectedEvmAccount?.address,
    ),
  );
  // EVM native token balances in atomic hex amount
  const evmAccountsByChainId = useSelector(selectAccountsByChainId);
  // EVM non-native token balances in atomic hex amount
  const evmTokenBalances = useSelector(selectTokensBalances);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  // Already contains balance and fiat values for native SOL and SPL tokens
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
      Object.values(evmAccountTokensAcrossChains).flat() as TokenI[]
    )
      .filter((token) => chainIds.includes(token.chainId as Hex))
      .filter((token) => !token.isStaked);

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const allNonEvmAccountTokens = Object.values(nonEvmTokens)
      .flat()
      .filter((token) => chainIds.includes(token.chainId));
    ///: END:ONLY_INCLUDE_IF

    const evmBalances = calculateEvmBalances({
      assets: allEvmAccountTokens,
      multiChainMarketData,
      multiChainTokenBalance: evmTokenBalances,
      networkConfigurationsByChainId,
      multiChainCurrencyRates,
      currentCurrency,
      selectedAddress: lastSelectedEvmAccount?.address as Hex,
      evmAccountsByChainId,
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
        const evmBalance = evmBalances?.[i]?.balance;
        const nonEvmBalance = renderNumber(token.balance ?? '0');

        const evmBalanceFiat = evmBalances?.[i]?.balanceFiat;
        const nonEvmBalanceFiat = renderFiat(
          Number(token.balanceFiat ?? 0),
          currentCurrency,
        );

        const evmTokenFiatAmount = evmBalances?.[i]?.tokenFiatAmount;
        const nonEvmTokenFiatAmount = Number(token.balanceFiat);

        return {
          address: token.address,
          name: token.name,
          decimals: token.decimals,
          symbol: token.isETH ? 'ETH' : token.symbol, // TODO: not sure why symbol is ETHEREUM, will also break the token icon for ETH
          chainId: token.chainId as Hex | CaipChainId,
          image: token.image,
          tokenFiatAmount: evmTokenFiatAmount ?? nonEvmTokenFiatAmount,
          balance: evmBalance ?? nonEvmBalance,
          balanceFiat: evmBalanceFiat ?? nonEvmBalanceFiat,
        };
      });
    return sortAssets(properTokens, tokenSortConfig);
  }, [
    evmAccountTokensAcrossChains,
    multiChainMarketData,
    evmTokenBalances,
    networkConfigurationsByChainId,
    multiChainCurrencyRates,
    currentCurrency,
    tokenSortConfig,
    lastSelectedEvmAccount?.address,
    chainIds,
    evmAccountsByChainId,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmTokens,
    ///: END:ONLY_INCLUDE_IF
  ]);

  return sortedTokens;
};
