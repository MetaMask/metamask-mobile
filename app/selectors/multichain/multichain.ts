///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
/* eslint-disable arrow-body-style */
import {
  MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET,
  MULTICHAIN_PROVIDER_CONFIGS,
  MultichainProviderConfig,
} from '../../core/Multichain/constants';
import { CaipChainId, Hex, KnownCaipNamespace } from '@metamask/utils';
import { RootState } from '../../reducers';
import {
  selectNetworkConfigurations,
  selectChainId as selectEvmChainId,
  selectProviderConfig as selectEvmProviderConfig,
  ProviderConfig,
} from '../networkController';
import {
  selectSelectedInternalAccount,
  selectInternalAccounts,
} from '../accountsController';
import { createDeepEqualSelector } from '../util';
import { isEvmAccountType } from '@metamask/keyring-api';
import { selectConversionRate } from '../currencyRateController';
import { isMainNet } from '../../util/networks';
import {
  MultichainNetworks,
  NETWORK_ASSETS_MAP,
} from '@metamask/assets-controllers';
import {
  selectAccountBalanceByChainId,
  selectAccountsByChainId,
} from '../accountTrackerController';
import { selectShowFiatInTestnets } from '../settings';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { getFormattedAddressFromInternalAccount } from '../../core/Multichain/utils';
import { isEthAccount } from '../../core/Multichain/utils';

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

/**
 * Get the state of the `solanaSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `solanaSupportEnabled` flag.
 */
export function selectIsSolanaSupportEnabled(state: RootState) {
  return state.multichainSettings.solanaSupportEnabled;
}

export const selectMultichainIsEvm = createDeepEqualSelector(
  selectSelectedInternalAccount,
  (selectedAccount) => {
    // If no account selected, assume EVM for onboarding scenario
    if (!selectedAccount) {
      return true;
    }
    return isEvmAccountType(selectedAccount.type);
  },
);

export interface MultichainNetwork {
  nickname: string;
  isEvmNetwork: boolean;
  chainId: CaipChainId;
  network: ProviderConfig | MultichainProviderConfig;
}

export function selectMultichainNetworkProviders(): MultichainProviderConfig[] {
  return Object.values(MULTICHAIN_PROVIDER_CONFIGS);
}

export const selectMultichainCurrentNetwork = createDeepEqualSelector(
  [
    selectMultichainIsEvm,
    selectEvmChainId,
    selectEvmProviderConfig,
    selectNetworkConfigurations,
    selectSelectedInternalAccount,
  ],
  (
    isEvm,
    chainId,
    providerConfig,
    networkConfigurations,
    selectedAccount,
  ): MultichainNetwork => {
    if (isEvm) {
      // These are custom networks defined by the user.
      const networkConfiguration = providerConfig.id
        ? networkConfigurations[providerConfig.id as Hex]
        : undefined;
      // If there aren't any nicknames, the RPC URL is displayed.
      const nickname =
        networkConfiguration?.name ??
        providerConfig.nickname ??
        providerConfig.rpcUrl ??
        'Custom Network';

      return {
        nickname,
        isEvmNetwork: true,
        // We assume the chain ID is `string` or `number`, so we convert it to a
        // `Number` to be compliant with EIP155 CAIP chain ID
        chainId: `${KnownCaipNamespace.Eip155}:${Number(
          chainId,
        )}` as CaipChainId,
        network: providerConfig,
      };
    }

    // Non-EVM networks:
    if (!selectedAccount) {
      throw new Error(
        'Selected account is required for non-EVM networks. This should never happen.',
      );
    }

    const nonEvmNetworks = selectMultichainNetworkProviders();
    const nonEvmNetwork = nonEvmNetworks.find((provider) =>
      provider.isAddressCompatible(selectedAccount.address),
    );

    if (!nonEvmNetwork) {
      throw new Error(
        'Could not find non-EVM provider compatible with address: ' +
          selectedAccount.address,
      );
    }

    return {
      // TODO: Adapt this for other non-EVM networks
      nickname: nonEvmNetwork.nickname,
      isEvmNetwork: false,
      chainId: nonEvmNetwork?.chainId,
      network: nonEvmNetwork,
    };
  },
);

/**
 * Retrieves the provider configuration for a multichain network.
 *
 * This function extracts the `network` field from the result of `selectMultichainNetwork(state)`,
 * which is expected to be a `MultichainProviderConfig` object. The naming might suggest that
 * it returns a network, but it actually returns a provider configuration specific to a multichain setup.
 *
 * @returns The current multichain provider configuration.
 */
export const selectMultichainProviderConfig = createDeepEqualSelector(
  selectMultichainCurrentNetwork,
  (multichainCurrentNetwork) => multichainCurrentNetwork.network,
);

export const selectMultichainDefaultToken = createDeepEqualSelector(
  selectMultichainIsEvm,
  selectEvmProviderConfig,
  selectMultichainProviderConfig,
  (isEvm, evmProviderConfig, multichainProviderConfig) => {
    const symbol = isEvm
      ? evmProviderConfig.ticker
      : multichainProviderConfig.ticker;
    return { symbol };
  },
);

export const selectMultichainIsBitcoin = createDeepEqualSelector(
  selectMultichainIsEvm,
  selectMultichainDefaultToken,
  (isEvm, token) =>
    !isEvm &&
    token.symbol ===
      MULTICHAIN_PROVIDER_CONFIGS[MultichainNetworks.Bitcoin].ticker,
);

export const selectMultichainIsMainnet = createDeepEqualSelector(
  selectMultichainIsEvm,
  selectSelectedInternalAccount,
  selectEvmChainId,
  selectMultichainProviderConfig,
  (isEvm, selectedAccount, evmChainId, multichainProviderConfig) => {
    if (isEvm) {
      return isMainNet(evmChainId);
    }

    if (!selectedAccount) {
      return false;
    }

    const mainnet = (
      MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
    )[selectedAccount.type];
    return multichainProviderConfig.chainId === mainnet;
  },
);

/**
 *
 * @param state - Root redux state
 * @returns - MultichainBalancesController state
 */
const selectMultichainBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainBalancesController;

export const selectMultichainBalances = createDeepEqualSelector(
  selectMultichainBalancesControllerState,
  (multichainBalancesControllerState) =>
    multichainBalancesControllerState.balances,
);

export const selectMultichainShouldShowFiat = createDeepEqualSelector(
  selectMultichainIsMainnet,
  selectMultichainIsEvm,
  selectShowFiatInTestnets,
  (multichainIsMainnet, isEvm, shouldShowFiatOnTestnets) => {
    const isTestnet = !multichainIsMainnet;
    if (isEvm) {
      return isTestnet ? shouldShowFiatOnTestnets : true; // Is it safe to assume that we default show fiat for mainnet?
    }
    return (
      multichainIsMainnet || (isTestnet && Boolean(shouldShowFiatOnTestnets))
    );
  },
);

const selectNonEvmCachedBalance = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectMultichainCurrentNetwork,
  (selectedInternalAccount, multichainBalances, multichainCurrentNetwork) => {
    if (!selectedInternalAccount) {
      return undefined;
    }
    // We assume that there's at least one asset type in and that is the native
    // token for that network.
    const asset = NETWORK_ASSETS_MAP[multichainCurrentNetwork.chainId]?.[0];
    const balancesForAccount = multichainBalances?.[selectedInternalAccount.id];
    const balanceOfAsset = balancesForAccount?.[asset];
    return balanceOfAsset?.amount ?? 0;
  },
);

export const selectMultichainSelectedAccountCachedBalance =
  createDeepEqualSelector(
    selectMultichainIsEvm,
    selectAccountBalanceByChainId,
    selectNonEvmCachedBalance,
    (isEvm, accountBalanceByChainId, nonEvmCachedBalance) =>
      isEvm ? accountBalanceByChainId?.balance ?? '0x0' : nonEvmCachedBalance,
  );

export function selectMultichainCoinRates(state: RootState) {
  return state.engine.backgroundState.RatesController.rates;
}

export const selectMultichainConversionRate = createDeepEqualSelector(
  selectMultichainIsEvm,
  selectConversionRate,
  selectMultichainCoinRates,
  selectMultichainProviderConfig,
  (
    isEvm,
    evmConversionRate,
    multichaincCoinRates,
    multichainProviderConfig,
  ) => {
    if (isEvm) {
      return evmConversionRate;
    }
    const ticker = multichainProviderConfig?.ticker?.toLowerCase();
    return ticker ? multichaincCoinRates?.[ticker]?.conversionRate : undefined;
  },
);

interface BalanceData {
  amount: string;
}

interface MultichainBalances {
  [accountId: string]: {
    [chainId: string]: BalanceData;
  };
}

interface RatesControllerState {
  rates: {
    [ticker: string]: {
      conversionRate: number;
    };
  };
}

interface EngineState {
  backgroundState: {
    MultichainBalancesController: {
      balances: MultichainBalances;
    };
    RatesController: RatesControllerState;
  };
}

// New selectors for all accounts
export const selectAllAccountsIsEvm = createDeepEqualSelector(
  selectInternalAccounts,
  (accounts) => {
    return accounts.reduce<Record<string, boolean>>((acc, account) => {
      acc[account.id] = isEvmAccountType(account.type);
      return acc;
    }, {});
  },
);

export const selectAllAccountsDefaultTokens = createDeepEqualSelector(
  selectInternalAccounts,
  selectEvmProviderConfig,
  (accounts, evmProviderConfig) => {
    return accounts.reduce<Record<string, { symbol: string }>>(
      (acc, account) => {
        // Find the provider config that matches this account's address
        const nonEvmNetworks = Object.values(MULTICHAIN_PROVIDER_CONFIGS);
        const nonEvmNetwork = nonEvmNetworks.find((provider) =>
          provider.isAddressCompatible(account.address),
        );

        acc[account.id] = {
          symbol: isEvmAccountType(account.type)
            ? evmProviderConfig.ticker
            : nonEvmNetwork?.ticker || '',
        };
        return acc;
      },
      {},
    );
  },
);

export const selectAllAccountsShouldShowFiat = createDeepEqualSelector(
  selectInternalAccounts,
  selectEvmChainId,
  selectShowFiatInTestnets,
  (accounts, evmChainId, shouldShowFiatOnTestnets) => {
    return accounts.reduce<Record<string, boolean>>((acc, account) => {
      const isEvm = isEvmAccountType(account.type);
      const mainnet = (
        MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
      )[account.type];
      const nonEvmNetworks = Object.values(MULTICHAIN_PROVIDER_CONFIGS);
      const nonEvmNetwork = nonEvmNetworks.find((provider) =>
        provider.isAddressCompatible(account.address),
      );
      const isMainnet = isEvm
        ? isMainNet(evmChainId)
        : nonEvmNetwork?.chainId === mainnet;

      const isTestnet = !isMainnet;
      acc[account.id] = isEvm
        ? isTestnet
          ? Boolean(shouldShowFiatOnTestnets)
          : true
        : isMainnet || (isTestnet && Boolean(shouldShowFiatOnTestnets));
      return acc;
    }, {});
  },
);

export const selectAllAccountsConversionRates = createDeepEqualSelector(
  selectInternalAccounts,
  selectConversionRate,
  selectMultichainCoinRates,
  (accounts, evmConversionRate, multichaincCoinRates) => {
    return accounts.reduce<Record<string, number | undefined>>(
      (acc, account) => {
        if (isEvmAccountType(account.type)) {
          acc[account.id] = evmConversionRate;
        } else {
          const nonEvmNetworks = Object.values(MULTICHAIN_PROVIDER_CONFIGS);
          const nonEvmNetwork = nonEvmNetworks.find((provider) =>
            provider.isAddressCompatible(account.address),
          );
          const ticker = nonEvmNetwork?.ticker?.toLowerCase();
          acc[account.id] = ticker
            ? multichaincCoinRates?.[ticker]?.conversionRate
            : undefined;
        }
        return acc;
      },
      {},
    );
  },
);

export const selectAllAccountsBalances = createDeepEqualSelector(
  selectInternalAccounts,
  selectMultichainBalances,
  selectAccountsByChainId,
  (
    accounts: InternalAccount[],
    multichainBalances: MultichainBalances,
    accountsByChainId: Record<string, Record<string, { balance: string }>>,
  ) => {
    return accounts.reduce<Record<string, string>>(
      (acc: Record<string, string>, account: InternalAccount) => {
        if (isEvmAccountType(account.type)) {
          // For EVM accounts, look through all chain balances
          const formattedAddress =
            getFormattedAddressFromInternalAccount(account);
          // Find the first non-zero balance across all chains
          for (const chainId in accountsByChainId) {
            const chainAccounts = accountsByChainId[chainId];
            const accountBalance = chainAccounts[formattedAddress]?.balance;
            if (accountBalance && accountBalance !== '0x0') {
              acc[account.id] = accountBalance;
              return acc;
            }
          }
          // If no non-zero balance found, use the first chain's balance or 0x0
          const firstChainId = Object.keys(accountsByChainId)[0];
          acc[account.id] = firstChainId
            ? accountsByChainId[firstChainId][formattedAddress]?.balance ??
              '0x0'
            : '0x0';
        } else {
          // For non-EVM accounts, we need to look through all balances
          const balancesForAccount = multichainBalances?.[account.id] || {};
          // Find the first non-zero balance
          const nonZeroBalance = Object.values(balancesForAccount).find(
            (balance): balance is BalanceData =>
              balance?.amount !== undefined && balance.amount !== '0',
          );
          acc[account.id] = nonZeroBalance?.amount ?? '0';
        }
        return acc;
      },
      {},
    );
  },
);
///: END:ONLY_INCLUDE_IF
