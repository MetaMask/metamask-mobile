import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import { zeroAddress } from 'ethereumjs-util';
import { RootState } from '../reducers';
import {
  selectSelectedInternalAccountFormattedAddress,
  selectSelectedInternalAccount,
} from './accountsController';
import { selectAllTokens } from './tokensController';
import { selectAccountsByChainId } from './accountTrackerController';
import { selectNetworkConfigurations } from './networkController';
import { TokenI } from '../components/UI/Tokens/types';
import { getTicker } from '../util/transactions';
import { renderFromWei, renderFromTokenMinimalUnit } from '../util/number';
import { toHex } from '@metamask/controller-utils';
import { Token } from '@metamask/assets-controllers';

/**
 * Get the native tokens for the selected account across all chains.
 *
 * @param {Record<Hex, NetworkConfiguration>} networkConfigurations - The network configurations.
 * @param {ChainBalances} nativeTokenBalancesByChainId - The native token balances by chainId.
 * @returns {Record<string, TokenI[]>} The native tokens for the selected account across all chains.
 */
export function getNativeTokens(
  networkConfigurations: Record<Hex, NetworkConfiguration>,
  nativeTokenBalancesByChainId: ChainBalances,
): { [chainId: string]: TokenI[] } {
  const tokensByChain: { [chainId: string]: TokenI[] } = {};

  Object.values(networkConfigurations).forEach((token) => {
    const nativeChainId = token.chainId as Hex;
    const nativeTokenInfoByChainId =
      nativeTokenBalancesByChainId[nativeChainId];
    const isETH = ['ETH', 'GOETH', 'SepoliaETH', 'LineaETH'].includes(
      token.nativeCurrency || '',
    );
    const name = isETH ? `Ethereum` : token.name;
    const logo = isETH ? '../images/eth-logo-new.png' : '';
    const nativeAddress = zeroAddress() as Hex;

    tokensByChain[nativeChainId] = [];
    const networkConfig = networkConfigurations?.[nativeChainId];

    if (
      nativeTokenInfoByChainId &&
      nativeTokenInfoByChainId.isStaked &&
      nativeTokenInfoByChainId.stakedBalance !== '0x00' &&
      nativeTokenInfoByChainId.stakedBalance !== toHex(0)
    ) {
      // staked tokens
      tokensByChain[nativeChainId].push({
        ...nativeTokenInfoByChainId,
        chainId: nativeChainId,
        address: nativeAddress,
        balance: renderFromWei(nativeTokenInfoByChainId.stakedBalance), // X
        balanceFiat: '',
        isNative: true,
        aggregators: [],
        image: '',
        logo,
        isETH,
        decimals: 18,
        name,
        symbol: getTicker(networkConfig.nativeCurrency),
        isStaked: true,
      });
    }

    const nativeBalanceFormatted = renderFromWei(
      nativeTokenInfoByChainId?.balance,
    );
    // non-staked tokens
    tokensByChain[nativeChainId].push({
      ...nativeTokenInfoByChainId,
      address: nativeAddress,
      balance: nativeBalanceFormatted, // X
      chainId: nativeChainId,
      isNative: true,
      aggregators: [],
      balanceFiat: '',
      image: '',
      logo,
      isETH,
      decimals: 18,
      name,
      symbol: getTicker(token.nativeCurrency),
      isStaked: false,
    });
  });

  return tokensByChain;
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
    selectNetworkConfigurations,
    selectedAccountNativeTokenCachedBalanceByChainId,
  ],
  (
    selectedAccount,
    allTokens,
    networkConfigurations,
    nativeTokenBalancesByChainId,
  ) => {
    const selectedAddress = selectedAccount?.address;
    const tokensByChain: { [chainId: string]: (TokenI | Token)[] } = {};

    if (!selectedAddress) {
      return tokensByChain;
    }

    // Create a list of available chainIds
    const chainIds = Object.keys(networkConfigurations);
    const nativeTokens = getNativeTokens(
      networkConfigurations,
      nativeTokenBalancesByChainId,
    );

    // Add non-native tokens if they exist for this chain
    Array.from(chainIds).forEach((chainId) => {
      const currentChainId = chainId as Hex;
      const nonNativeTokens =
        allTokens[currentChainId]?.[selectedAddress]?.map((token) => ({
          ...token,
          chainId,
          isETH: false,
          isNative: false,
          balanceFiat: '',
          isStaked: false,
        })) || [];

      // Add both native and non-native tokens
      tokensByChain[currentChainId] = [
        ...(nativeTokens[currentChainId] || []),
        ...nonNativeTokens,
      ];
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
