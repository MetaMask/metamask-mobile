import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { TokenI } from '../Tokens/types';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { selectCurrencyRates, selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { deriveBalanceFromAssetMarketDetails, sortAssets } from '../Tokens/util';
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
import { selectSelectedSourceChainIds } from '../../../core/redux/slices/bridge';
import { selectAccountTokensAcrossChains } from '../../../selectors/multichain';

export type TokenIWithFiatAmount = TokenI & { tokenFiatAmount: number };

interface CalculateFiatBalancesParams {
  assets: TokenI[];
  multiChainMarketData: ReturnType<typeof selectTokenMarketData>;
  multiChainTokenBalance: ReturnType<typeof selectTokensBalances>;
  networkConfigurationsByChainId: ReturnType<typeof selectNetworkConfigurations>;
  multiChainCurrencyRates: ReturnType<typeof selectCurrencyRates>;
  currentCurrency: string;
  selectedAddress: Hex;
}

// From app/components/UI/Tokens/index.tsx
const calculateFiatBalances = ({
  assets,
  multiChainMarketData,
  multiChainTokenBalance,
  networkConfigurationsByChainId,
  multiChainCurrencyRates,
  currentCurrency,
  selectedAddress
}: CalculateFiatBalancesParams) =>
  assets.map((token) => {
    const chainId = token.chainId as Hex;
    const multiChainExchangeRates = multiChainMarketData?.[chainId];
    const multiChainTokenBalances =
      multiChainTokenBalance?.[selectedAddress]?.[
        chainId
      ];
    const nativeCurrency =
      networkConfigurationsByChainId[chainId].nativeCurrency;
    const multiChainConversionRate =
      multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

    return token.isETH || token.isNative
      ? parseFloat(token.balance) * multiChainConversionRate
      : deriveBalanceFromAssetMarketDetails(
          token,
          multiChainExchangeRates || {},
          multiChainTokenBalances || {},
          multiChainConversionRate || 0,
          currentCurrency || '',
        ).balanceFiatCalculation;
  });

// TODO Look into useMultichainBalances hook, or useGetFormattedTokensPerChain hook
export const useSourceTokens = () => {
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedInternalAccountAddress = useSelector(selectSelectedInternalAccountAddress) as Hex;
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  // Fiat conversion rates
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);

  // All tokens across chains and their balances
   // Includes native and non-native tokens
  const accountTokensAcrossChains = useSelector(selectAccountTokensAcrossChains);
  const multiChainTokenBalance = useSelector(selectTokensBalances);

  // Chain ids to filter by
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);

  const sortedTokens = useMemo(() => {
    const allAccountTokens = Object.values(accountTokensAcrossChains)
    .flat()
    .filter((token) => selectedSourceChainIds.includes(token.chainId as Hex)) as TokenI[];

    const tokenFiatBalances = calculateFiatBalances({
      assets: allAccountTokens,
      multiChainMarketData,
      multiChainTokenBalance,
      networkConfigurationsByChainId,
      multiChainCurrencyRates,
      currentCurrency,
      selectedAddress: selectedInternalAccountAddress,
    });
    const tokensWithBalances = allAccountTokens.map((token, i) => ({
      ...token,
      tokenFiatAmount: tokenFiatBalances[i] ?? 0,
    }));
    return sortAssets(tokensWithBalances, tokenSortConfig);
  }, [
    accountTokensAcrossChains,
    multiChainMarketData,
    multiChainTokenBalance,
    networkConfigurationsByChainId,
    multiChainCurrencyRates,
    currentCurrency,
    selectedInternalAccountAddress,
    tokenSortConfig,
    selectedSourceChainIds,
  ]);

  console.log('HELLO sortedTokens', sortedTokens[1]);

  return sortedTokens;
};
