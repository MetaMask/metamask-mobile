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
const calculateBalances = ({
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
      tokenFiatAmount: res.balanceFiat,
      balance: res.balance,
      balanceFiat: res.balanceFiat,
    };
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

  console.log('HELLO selectedSourceChainIds', selectedSourceChainIds, accountTokensAcrossChains);

  const sortedTokens = useMemo(() => {
    const allAccountTokens = (
      Object.values(accountTokensAcrossChains).flat() as TokenI[]
    )
    .filter((token) => selectedSourceChainIds.includes(token.chainId as Hex));

    const balances = calculateBalances({
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
      tokenFiatAmount: balances[i].tokenFiatAmount ?? 0,
      balance: balances[i].balance,
      balanceFiat: balances[i].balanceFiat,
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

  return sortedTokens;
};
