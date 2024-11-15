import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';
import { RootState } from '../reducers';
import I18n from '../../locales/i18n';
import {
  selectSelectedInternalAccountChecksummedAddress,
  selectSelectedInternalAccount,
} from './accountsController';
import { selectAllTokens } from './tokensController';
import { selectTokensBalances } from './tokenBalancesController';
import { selectAccountsByChainId } from './accountTrackerController';
import { selectNetworkConfigurations } from './networkController';
import { selectTokenMarketData as selectMarketData } from './tokenRatesController';
import {
  selectCurrentCurrency,
  selectConversionRateByTicker,
} from './currencyRateController';

import { AssetType } from '../components/UI/SimulationDetails/types';
import { TokenI } from '../components/UI/Tokens/types';

import { getTicker } from '../util/transactions';
import {
  renderFromWei,
  renderFromTokenMinimalUnit,
  weiToFiat,
  hexToBN,
} from '../util/number';
import { toHex } from '@metamask/controller-utils';

interface AccountInfo {
  balance: string;
}

interface ChainAccounts {
  [address: string]: AccountInfo;
}

interface AccountsByChainId {
  [chainId: string]: ChainAccounts;
}

export function getNativeTokenInfo(state: RootState, chainId: Hex) {
  const networkConfigurationsByChainId = selectNetworkConfigurations(state);
  const networkConfig = networkConfigurationsByChainId?.[chainId];

  if (networkConfig) {
    const symbol = networkConfig.nativeCurrency || AssetType.Native;
    const decimals = 18;
    const name = networkConfig.name || 'Native Token';

    return {
      symbol,
      decimals,
      name,
    };
  }
}

export function getSelectedAccountNativeTokenCachedBalanceByChainId(
  state: RootState,
) {
  const selectedAddress =
    selectSelectedInternalAccountChecksummedAddress(state);
  const accountsByChainId = selectAccountsByChainId(state);

  const balancesByChainId: { [chainId: string]: string } = {};

  if (!selectedAddress) {
    return balancesByChainId;
  }

  for (const [chainId, accounts] of Object.entries(
    accountsByChainId || ({} as AccountsByChainId),
  )) {
    if (accounts[selectedAddress]) {
      balancesByChainId[chainId] = accounts[selectedAddress].balance;
    }
  }

  return balancesByChainId;
}

export const selectAccountTokensAcrossChains = createSelector(
  [
    selectSelectedInternalAccount,
    selectAllTokens,
    selectTokensBalances,
    selectNetworkConfigurations,
    getSelectedAccountNativeTokenCachedBalanceByChainId,
    selectMarketData,
    selectCurrentCurrency,
    (state: RootState) => state,
  ],
  (
    selectedAccount,
    allTokens,
    tokenBalances,
    networkConfigurations,
    nativeTokenBalancesByChainId,
    tokenExchangeRates,
    currentCurrency,
    state,
  ) => {
    const selectedAddress = selectedAccount?.address;
    const tokensByChain: { [chainId: string]: TokenI[] } = {};

    if (!selectedAddress) {
      return tokensByChain;
    }

    // Create a list of available chainIds
    const chainIds = Object.keys(networkConfigurations);

    Array.from(chainIds).forEach((chainId) => {
      const currentChainId = chainId as Hex;
      tokensByChain[currentChainId] = [];

      // Add non-native tokens
      const userTokens = (allTokens[currentChainId]?.[selectedAddress] ||
        []) as TokenI[];
      const ticker = networkConfigurations?.[chainId as Hex].nativeCurrency;
      const conversionRateByTicker = selectConversionRateByTicker(
        state,
        ticker,
      );
      const chainBalances =
        tokenBalances[selectedAddress as Hex]?.[currentChainId] || {};
      const tokenExchangeRateByChainId = tokenExchangeRates[chainId as Hex];

      // Add non-native tokens if they exist for this chain
      tokensByChain[currentChainId] = userTokens.map((token) => {
        const tokenAddress = token.address as Hex;
        const tokenExchangeRatePriceByTokenAddress =
          // TODO: Some exchange rates for some tokens don't exist? Is this expected?
          tokenExchangeRateByChainId[tokenAddress]?.price || 0;

        // Calculate token balance
        const tokenBalance = renderFromTokenMinimalUnit(
          chainBalances[token.address as Hex] || '0x0',
          token.decimals || 18,
        );

        // Remove any non-numeric characters except decimal point e.g. < 0.00001
        const cleanTokenBalance = tokenBalance.replace(/[^0-9.]/g, '');
        const floatTokenBalance = parseFloat(cleanTokenBalance);

        const adjustedTokenBalance = tokenBalance.startsWith('<')
          ? 0.00001
          : floatTokenBalance;

        // Format token balance in fiat
        const tokenFiatAmount =
          tokenExchangeRatePriceByTokenAddress *
          conversionRateByTicker *
          adjustedTokenBalance;
        const balanceFiat = new Intl.NumberFormat(I18n.locale, {
          currency: currentCurrency.toUpperCase(),
          style: 'currency',
        }).format(tokenFiatAmount);

        return {
          ...token,
          balance: tokenBalance,
          chainId,
          balanceFiat,
          logo: token.image,
          isETH: false,
          isNative: false,
        };
      });

      // Add native token if it exists for this chain
      const nativeBalance = nativeTokenBalancesByChainId[chainId];
      if (nativeBalance && nativeBalance !== toHex(0)) {
        const nativeTokenInfo = getNativeTokenInfo(state, chainId as Hex);

        // Calculate native token balance
        const nativeBalanceFormatted = renderFromWei(nativeBalance);
        const isETH = ['ETH', 'GOETH', 'SepoliaETH', 'LineaETH'].includes(
          nativeTokenInfo?.symbol || '',
        );

        // Remove any non-numeric characters except decimal point e.g. < 0.00001
        const cleanNativeBalance = nativeBalanceFormatted.replace(
          /[^0-9.]/g,
          '',
        );
        const floatNativeBalance = parseFloat(cleanNativeBalance);

        let nativeBalanceFiat = '';

        // calculate balance in fiat depending on the token
        if (isETH) {
          nativeBalanceFiat = weiToFiat(
            hexToBN(nativeBalance),
            conversionRateByTicker,
            currentCurrency,
          );
        } else {
          const tokenFiatAmount = floatNativeBalance * conversionRateByTicker;
          nativeBalanceFiat = new Intl.NumberFormat(I18n.locale, {
            currency: currentCurrency.toUpperCase(),
            style: 'currency',
          }).format(tokenFiatAmount);
        }

        tokensByChain[chainId].push({
          ...nativeTokenInfo,
          address: '',
          balance: nativeBalanceFormatted,
          balanceFiat: nativeBalanceFiat,
          chainId,
          isNative: true,
          aggregators: [],
          image: '',
          logo: isETH ? '../images/eth-logo-new.png' : '',
          isETH,
          decimals: nativeTokenInfo?.decimals || 18,
          name: isETH ? `Ethereum` : ticker,
          symbol: getTicker(nativeTokenInfo?.symbol),
        });
      }
    });

    return tokensByChain;
  },
);
