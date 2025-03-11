import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { constants, utils } from 'ethers';
import { Hex } from '@metamask/utils';
import { TokenI } from '../Tokens/types';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { selectTokens } from '../../../selectors/tokensController';
import { selectChainId } from '../../../selectors/networkController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
import { selectConversionRate, selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectAccountBalanceByChainId } from '../../../selectors/accountTrackerController';
import { addCurrencySymbol, renderFromWei, weiToFiat, hexToBN, weiToFiatNumber } from '../../../util/number';
import { sortAssets } from '../Tokens/util';
import { selectERC20TokensByChain } from '../../../selectors/tokenListController';
import { TokenListToken } from '@metamask/assets-controllers';
import { getNativeSwapsToken } from '@metamask/swaps-controller/dist/swapsUtil';
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
interface GetNativeAssetParams {
  accountBalanceByChainId: ReturnType<typeof selectAccountBalanceByChainId>;
  conversionRate: number;
  currentCurrency: string;
  currentChainId: Hex;
}

type TokenIWithFiatAmount = TokenI & { tokenFiatAmount: number };

function getNativeToken({
  accountBalanceByChainId,
  conversionRate,
  currentCurrency,
  currentChainId,
}: GetNativeAssetParams): TokenIWithFiatAmount {
  const nativeSwapsToken = getNativeSwapsToken(currentChainId);
  const nativeBalance = renderFromWei(accountBalanceByChainId?.balance ?? '0');

  return {
    address: nativeSwapsToken.address,
    symbol: nativeSwapsToken.symbol,
    name: nativeSwapsToken.name ?? 'unknown',
    decimals: nativeSwapsToken.decimals,
    isETH: false,
    isNative: true,
    balance: nativeBalance,
    balanceFiat: weiToFiat(
      hexToBN(accountBalanceByChainId?.balance ?? '0'),
      conversionRate,
      currentCurrency,
    ),
    tokenFiatAmount: weiToFiatNumber(
      hexToBN(accountBalanceByChainId?.balance ?? '0'),
      conversionRate,
    ),
    aggregators: [],
    hasBalanceError: false,
    chainId: currentChainId,
    image: nativeSwapsToken.iconUrl ?? '',
    logo: nativeSwapsToken.iconUrl ?? '',
  };
}

export const useSourceTokens = () => {
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const tokens = useSelector(selectTokens);
  const currentChainId = useSelector(selectChainId) as Hex;
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const conversionRate = useSelector(selectConversionRate) ?? 0;
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedInternalAccountAddress = useSelector(selectSelectedInternalAccountAddress) as Hex;
  const accountBalanceByChainId = useSelector(selectAccountBalanceByChainId);
  const erc20TokensByChain = useSelector(selectERC20TokensByChain);

  const tokensList = useMemo(() => {
    const nativeToken = getNativeToken({
      accountBalanceByChainId,
      conversionRate,
      currentCurrency,
      currentChainId,
    });

    // Process regular tokens with balances
    const tokensWithBalances: TokenIWithFiatAmount[] = tokens.map((token) => {
      const balance = tokenBalances?.[selectedInternalAccountAddress]?.[currentChainId]?.[token.address as Hex] || '0';
      const formattedBalance = utils.formatUnits(balance, token.decimals);

      const exchangeRate = token.address === constants.AddressZero
        ? 1  // For native token
        : tokenExchangeRates?.[token.address as Hex]?.price || 0;

      const fiatValue = parseFloat(formattedBalance) * exchangeRate * conversionRate;
      const balanceFiat = fiatValue >= 0.01 || fiatValue === 0
        ? addCurrencySymbol(fiatValue, currentCurrency)
        : `< ${addCurrencySymbol('0.01', currentCurrency)}`;

      return {
        ...token,
        balance: formattedBalance, // e.g. 1.2345
        balanceFiat, // e.g. $100.00, cannot sort on this field
        tokenFiatAmount: fiatValue, // Can sort on this field
        logo: token.image,
        isETH: token.address === constants.AddressZero,
        isNative: token.address === constants.AddressZero,
        aggregators: token.aggregators || [],
        image: token.image ?? '',
        name: token.name ?? token.symbol,
        hasBalanceError: false,
        chainId: currentChainId,
      };
    });

    // Get additional tokens from the token list for the current chain
    const chainTokens = erc20TokensByChain?.[currentChainId]?.data || {};
    const additionalTokens = Object.values(chainTokens)
      .filter((token): token is TokenListToken => {
        if (!token || typeof token !== 'object') return false;
        // Skip if token is already in tokensWithBalances
        return !tokensWithBalances.some(t => t.address.toLowerCase() === token.address?.toLowerCase());
      })
      .map((token) => ({
        ...token,
        balance: '0',
        balanceFiat: addCurrencySymbol(0, currentCurrency),
        logo: token.iconUrl || '',
        isETH: false,
        isNative: false,
        aggregators: [],
        image: token.iconUrl || '',
        name: token.name,
        hasBalanceError: false,
        chainId: currentChainId,
      } as TokenI));

    // Add native token first, then tokens with balances, then additional tokens
    const allTokens = [
      nativeToken,
      ...tokensWithBalances,
      ...additionalTokens,
    ];

    // Sort tokens by fiat value
    return sortAssets(allTokens, tokenSortConfig);
  }, [
    tokens,
    tokenBalances,
    selectedInternalAccountAddress,
    currentChainId,
    tokenExchangeRates,
    conversionRate,
    currentCurrency,
    accountBalanceByChainId,
    erc20TokensByChain,
    tokenSortConfig,
  ]);

  return tokensList;
};
