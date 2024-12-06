import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import { zeroAddress } from 'ethereumjs-util';
import { RootState } from '../reducers';
import I18n from '../../locales/i18n';
import {
  selectSelectedInternalAccountFormattedAddress,
  selectSelectedInternalAccount,
} from './accountsController';
import { selectAllTokens } from './tokensController';
import { selectTokensBalances } from './tokenBalancesController';
import { selectAccountsByChainId } from './accountTrackerController';
import { selectNetworkConfigurations } from './networkController';
import { selectTokenMarketData as selectMarketData } from './tokenRatesController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
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

export function getNativeTokenInfo(
  networkConfigurations: Record<Hex, NetworkConfiguration>,
  chainId: Hex,
) {
  const networkConfig = networkConfigurations?.[chainId];

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

interface NativeTokenBalance {
  balance: string;
  stakedBalance: string;
  isStaked: boolean;
  name: string;
}

type ChainBalances = Record<string, NativeTokenBalance>;

/**
 * Get the cached native token balance for the selected account by chainId.
 *
 * @param {RootState} state - The root state.
 * @returns {ChainBalances} The cached native token balance for the selected account by chainId.
 */
export const selectedAccountNativeTokenCachedBalanceByChainId = createSelector(
  [selectSelectedInternalAccountFormattedAddress, selectAccountsByChainId],
  (selectedAddress, accountsByChainId): ChainBalances => {
    if (!selectedAddress || !accountsByChainId) {
      return {};
    }

    return Object.entries(accountsByChainId).reduce<ChainBalances>(
      (acc, [chainId, accounts]) => {
        const account = accounts[selectedAddress];
        if (account) {
          acc[chainId] = {
            balance: account.balance,
            stakedBalance: account.stakedBalance ?? '0x0',
            isStaked: account.stakedBalance !== '0x0',
            name: 'Staked Ethereum',
          };
        }
        return acc;
      },
      {},
    );
  },
);

/**
 * Get the tokens for the selected account across all chains.
 *
 * @param {RootState} state - The root state.
 * @returns {TokensByChain} The tokens for the selected account across all chains.
 */
export const selectAccountTokensAcrossChains = createSelector(
  [
    selectSelectedInternalAccount,
    selectAllTokens,
    selectTokensBalances,
    selectNetworkConfigurations,
    selectedAccountNativeTokenCachedBalanceByChainId,
    selectMarketData,
    selectCurrentCurrency,
    selectCurrencyRates,
  ],
  (
    selectedAccount,
    allTokens,
    tokenBalances,
    networkConfigurations,
    nativeTokenBalancesByChainId,
    tokenExchangeRates,
    currentCurrency,
    currencyRates,
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

      if (!tokensByChain[currentChainId]) {
        tokensByChain[currentChainId] = [];
      }

      // Add non-native tokens
      const userTokens = (allTokens[currentChainId]?.[selectedAddress] ||
        []) as TokenI[];
      const nativeCurrency =
        networkConfigurations?.[chainId as Hex].nativeCurrency;
      const conversionRateByNativeCurrency =
        currencyRates?.[nativeCurrency]?.conversionRate || 0;
      const chainBalances =
        tokenBalances[selectedAddress as Hex]?.[currentChainId] || {};
      const tokenExchangeRateByChainId = tokenExchangeRates[chainId as Hex];

      if (allTokens[currentChainId]?.[selectedAddress]) {
        // Add non-native tokens if they exist for this chain
        tokensByChain[currentChainId] = userTokens.map((token) => {
          const tokenAddress = token.address as Hex;
          const tokenExchangeRatePriceByTokenAddress =
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
            conversionRateByNativeCurrency *
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
            symbol: getTicker(token.symbol),
          };
        });
      }

      // Add native token if it exists for this chain
      const nativeTokenInfoByChainId = nativeTokenBalancesByChainId[chainId];
      if (nativeTokenInfoByChainId) {
        const nativeTokenInfo = getNativeTokenInfo(
          networkConfigurations,
          chainId as Hex,
        );

        // Calculate native token balance
        const nativeBalanceFormatted = renderFromWei(
          nativeTokenInfoByChainId.balance,
        );
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
            hexToBN(nativeTokenInfoByChainId.balance),
            conversionRateByNativeCurrency,
            currentCurrency,
          );
        } else {
          const tokenFiatAmount =
            floatNativeBalance * conversionRateByNativeCurrency;
          nativeBalanceFiat = new Intl.NumberFormat(I18n.locale, {
            currency: currentCurrency.toUpperCase(),
            style: 'currency',
          }).format(tokenFiatAmount);
        }
        const name = isETH ? `Ethereum` : nativeCurrency;
        const address = zeroAddress() as Hex;
        const logo = isETH ? '../images/eth-logo-new.png' : '';
        const decimals = nativeTokenInfo?.decimals || 18;
        const symbol = getTicker(nativeTokenInfo?.symbol);
        const aggregators: string[] = [];
        const nativeAsset = {
          ...nativeTokenInfo,
          address,
          balance: nativeBalanceFormatted,
          balanceFiat: nativeBalanceFiat,
          chainId,
          isNative: true,
          aggregators,
          image: '',
          logo,
          isETH,
          decimals,
          name,
          symbol,
        };
        tokensByChain[chainId].push(nativeAsset);

        if (
          nativeTokenInfoByChainId.isStaked &&
          nativeTokenInfoByChainId.stakedBalance !== '0x00' &&
          nativeTokenInfoByChainId.stakedBalance !== toHex(0)
        ) {
          const stakedBalance = renderFromWei(
            nativeTokenInfoByChainId.stakedBalance,
          );
          const stakedBalanceFiat = weiToFiat(
            hexToBN(nativeTokenInfoByChainId.stakedBalance),
            conversionRateByNativeCurrency,
            currentCurrency,
          );

          tokensByChain[chainId].push({
            ...nativeTokenInfo,
            nativeAsset,
            address,
            balance: stakedBalance,
            balanceFiat: stakedBalanceFiat,
            chainId,
            isNative: true,
            aggregators,
            image: '',
            logo,
            isETH,
            decimals,
            name: nativeTokenInfoByChainId.name,
            symbol,
            isStaked: nativeTokenInfoByChainId.isStaked,
          });
        }
      }
    });

    return tokensByChain;
  },
);

/**
 * Get the state of the `bitcoinSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `bitcoinSupportEnabled` flag.
 */
export function selectIsBitcoinSupportEnabled(state: RootState) {
  return state.multichainSettings.bitcoinSupportEnabled;
}

/**
 * Get the state of the `bitcoinTestnetSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `bitcoinTestnetSupportEnabled` flag.
 */
export function selectIsBitcoinTestnetSupportEnabled(state: RootState) {
  return state.multichainSettings.bitcoinTestnetSupportEnabled;
}
