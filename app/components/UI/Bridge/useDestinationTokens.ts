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
import { addCurrencySymbol, renderFromWei, weiToFiat, hexToBN, weiToFiatNumber, balanceToFiatNumber, renderNumber } from '../../../util/number';
import { sortAssets } from '../Tokens/util';
import { selectERC20TokensByChain } from '../../../selectors/tokenListController';
import { TokenListToken } from '@metamask/assets-controllers';
import { getNativeSwapsToken } from '@metamask/swaps-controller/dist/swapsUtil';
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
import { selectSelectedSourceChainIds } from '../../../core/redux/slices/bridge';
import { selectNativeTokensAcrossChains } from '../../../selectors/multichain';
interface GetNativeAssetParams {
  nativeToken: TokenI;
  accountBalanceByChainId: ReturnType<typeof selectAccountBalanceByChainId>;
  conversionRate: number;
}

export type TokenIWithFiatAmount = TokenI & { tokenFiatAmount: number };

function getNativeToken({
  nativeToken,
  accountBalanceByChainId,
  conversionRate,
}: GetNativeAssetParams): TokenIWithFiatAmount {
  return {
    ...nativeToken,
    symbol: nativeToken.ticker ?? nativeToken.symbol ?? '', // TODO not sure why symbol is ETHEREUM and not ETH
    // Need this field to sort on later
    tokenFiatAmount: weiToFiatNumber(
      hexToBN(accountBalanceByChainId?.balance ?? '0'),
      conversionRate,
    ),
  };
}

// TODO Look into useMultichainBalances hook, or useGetFormattedTokensPerChain hook
export const useDestinationTokens = () => {
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
  const nativeTokensAcrossChains = useSelector(selectNativeTokensAcrossChains);

  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);

  const tokensList = useMemo(() => {
    const nativeToken = getNativeToken({
      // nativeTokensAcrossChains includes staked versions of the native token, so we need to filter for the non-staked version
      nativeToken: nativeTokensAcrossChains?.[currentChainId].filter(token => token.address === constants.AddressZero)[0],
      accountBalanceByChainId,
      conversionRate,
    });

    // Process regular tokens with balances
    const tokensWithBalances: TokenIWithFiatAmount[] = tokens.map((token) => {
      const atomicBalance = tokenBalances?.[selectedInternalAccountAddress]?.[currentChainId]?.[token.address as Hex] || '0';
      const balance = utils.formatUnits(atomicBalance, token.decimals);
      const formattedBalance = renderNumber(balance);

      const exchangeRate = token.address === constants.AddressZero
        ? 1  // For native token
        : tokenExchangeRates?.[token.address as Hex]?.price || 0;

      const formattedBalanceFiatNumber = balanceToFiatNumber(balance, conversionRate, exchangeRate);
      const formattedBalanceFiat = addCurrencySymbol(formattedBalanceFiatNumber, currentCurrency);

      return {
        ...token,
        balance: formattedBalance, // e.g. 1.2345, truncated decimals
        balanceFiat: formattedBalanceFiat, // e.g. $100.00, cannot sort on this field, truncated decimals
        tokenFiatAmount: formattedBalanceFiatNumber, // Can sort on this field
        logo: token.image,
        isETH: token.address === constants.AddressZero,
        isNative: token.address === constants.AddressZero,
        aggregators: token.aggregators || [],
        image: token.image ?? '',
        name: token.name ?? token.symbol,
        chainId: token.chainId,
      };
    });

    console.log('tokensWithBalances', tokensWithBalances[0]);

    // Get additional tokens from the token list for the current chain
    const chainTokens = erc20TokensByChain?.[currentChainId]?.data || {};
    const additionalTokens: TokenIWithFiatAmount[] = Object.values(chainTokens)
      .filter((token): token is TokenListToken => {
        if (!token || typeof token !== 'object') return false;
        // Skip if token is already in tokensWithBalances
        return !tokensWithBalances.some(t => t.address.toLowerCase() === token.address?.toLowerCase());
      })
      .map((token) => ({
        ...token,
        balance: '0',
        balanceFiat: addCurrencySymbol(0, currentCurrency),
        tokenFiatAmount: 0,
        logo: token.iconUrl || '',
        isETH: false,
        isNative: false,
        aggregators: [],
        image: token.iconUrl || '',
        name: token.name,
        hasBalanceError: false,
        chainId: currentChainId,
      }));

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
    nativeTokensAcrossChains,
  ]);

  return tokensList;
};
