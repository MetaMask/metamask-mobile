import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { constants, utils } from 'ethers';
import { Hex } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { selectTokens } from '../../../../selectors/tokensController';
import { selectChainId, selectEvmTicker } from '../../../../selectors/networkController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectConversionRate, selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectAccountBalanceByChainId } from '../../../../selectors/accountTrackerController';
import { addCurrencySymbol, renderFromWei, weiToFiat, hexToBN } from '../../../../util/number';
import { getTicker } from '../../../../util/transactions';
import { sortAssets } from '../../Tokens/util';

export const useSourceTokens = () => {
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokens = useSelector(selectTokens);
  const currentChainId = useSelector(selectChainId) as Hex;
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const conversionRate = useSelector(selectConversionRate) || 0;
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedInternalAccountAddress = useSelector(selectSelectedInternalAccountAddress) as Hex;
  const ticker = useSelector(selectEvmTicker);
  const accountBalanceByChainId = useSelector(selectAccountBalanceByChainId);

  const tokensList = useMemo(() => {
    // First create native token (similar to index.tsx implementation)
    const nativeBalance = renderFromWei(accountBalanceByChainId?.balance || '0');

    const nativeAsset = {
      address: constants.AddressZero,
      symbol: getTicker(ticker),
      name: getTicker(ticker) === 'ETH' ? 'Ethereum' : ticker,
      decimals: 18,
      isETH: true,
      isNative: true,
      balance: nativeBalance,
      balanceFiat: weiToFiat(
        hexToBN(accountBalanceByChainId?.balance || '0'),
        conversionRate,
        currentCurrency,
      ),
    };

    // Create complete native token with required props
    const nativeTokenWithProps: TokenI = {
      ...nativeAsset,
      logo: '../images/eth-logo-new.png',
      image: '',
      aggregators: [],
      hasBalanceError: false,
      chainId: currentChainId,
    };

    // Process regular tokens
    const tokensWithBalances = tokens.map((token) => {
      const balance = tokenBalances?.[selectedInternalAccountAddress]?.[currentChainId]?.[token.address as Hex] || '0';
      const formattedBalance = utils.formatUnits(balance, token.decimals);

      const exchangeRate = token.address === constants.AddressZero
        ? 1  // For native token
        : tokenExchangeRates?.[token.address as Hex]?.price || 0;

      const fiatValue = parseFloat(formattedBalance) * exchangeRate * conversionRate;
      const balanceFiat = fiatValue >= 0.01 || fiatValue === 0
        ? addCurrencySymbol(fiatValue, currentCurrency)
        : `< ${addCurrencySymbol('0.01', currentCurrency)}`;

      const tokenWithRequiredProps: TokenI = {
        ...token,
        balance: formattedBalance,
        balanceFiat,
        logo: token.image,
        isETH: token.address === constants.AddressZero,
        isNative: token.address === constants.AddressZero,
        aggregators: token.aggregators || [],
        image: token.image ?? '',
        name: token.name ?? token.symbol,
        hasBalanceError: false,
      };

      return {
        ...tokenWithRequiredProps,
        chainId: currentChainId,
        balance: formattedBalance,
        balanceFiat,
      };
    });

    // Add native token first in the list (similar to index.tsx)
    return sortAssets([nativeTokenWithProps, ...tokensWithBalances], tokenSortConfig);
  }, [
    tokens,
    tokenBalances,
    selectedInternalAccountAddress,
    currentChainId,
    tokenExchangeRates,
    conversionRate,
    currentCurrency,
    tokenSortConfig,
    ticker,
    accountBalanceByChainId,
  ]);

  return tokensList;
};
