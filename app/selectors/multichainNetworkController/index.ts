import { ImageSourcePropType } from 'react-native';
import { createSelector } from 'reselect';
import {
  MULTICHAIN_NETWORK_DECIMAL_PLACES,
  MULTICHAIN_NETWORK_TICKER,
  MultichainNetworkControllerState,
  type MultichainNetworkConfiguration,
} from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import { CaipChainId } from '@metamask/utils';
import { BtcScope, SolScope, EthScope } from '@metamask/keyring-api';
import { RootState } from '../../reducers';
import imageIcons from '../../images/image-icons';
import { createDeepEqualSelector } from '../util';

export const selectMultichainNetworkControllerState = (state: RootState) =>
  state.engine.backgroundState?.MultichainNetworkController;

export const selectIsEvmNetworkSelected = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    multichainNetworkControllerState.isEvmSelected,
);

export const selectSelectedNonEvmNetworkChainId = createDeepEqualSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    multichainNetworkControllerState.selectedMultichainNetworkChainId,
);

/**
 * This selector is used to get the non-EVM network configurations by chain ID.
 * It extends the network configurations with additional data for non-EVM networks that doens't have a source of truth source yet.
 *
 * @param state - The root state object.
 * @returns An object where the keys are chain IDs and the values are network configurations.
 */
export const selectNonEvmNetworkConfigurationsByChainId = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) => {
    const extendedNonEvmData: Record<
      CaipChainId,
      {
        decimals: number;
        imageSource: ImageSourcePropType;
        ticker: string;
        isTestnet: boolean;
        name?: string;
      }
    > = {
      [SolScope.Mainnet]: {
        decimals: MULTICHAIN_NETWORK_DECIMAL_PLACES[SolScope.Mainnet],
        imageSource: imageIcons.SOLANA,
        ticker: MULTICHAIN_NETWORK_TICKER[SolScope.Mainnet],
        isTestnet: false,
      },
      [BtcScope.Mainnet]: {
        decimals: MULTICHAIN_NETWORK_DECIMAL_PLACES[BtcScope.Mainnet],
        imageSource: imageIcons.BTC,
        ticker: MULTICHAIN_NETWORK_TICKER[BtcScope.Mainnet],
        isTestnet: false,
      },
      [BtcScope.Testnet]: {
        decimals: MULTICHAIN_NETWORK_DECIMAL_PLACES[BtcScope.Testnet],
        imageSource: imageIcons['BTC-TESTNET'],
        ticker: MULTICHAIN_NETWORK_TICKER[BtcScope.Testnet],
        isTestnet: true,
      },
      [BtcScope.Testnet4]: {
        decimals: MULTICHAIN_NETWORK_DECIMAL_PLACES[BtcScope.Testnet4],
        imageSource: imageIcons['BTC-TESTNET'],
        ticker: MULTICHAIN_NETWORK_TICKER[BtcScope.Testnet4],
        isTestnet: true,
      },
      [BtcScope.Signet]: {
        decimals: MULTICHAIN_NETWORK_DECIMAL_PLACES[BtcScope.Signet],
        imageSource: imageIcons['BTC-MUTINYNET'],
        ticker: MULTICHAIN_NETWORK_TICKER[BtcScope.Signet],
        isTestnet: true,
        name: 'Bitcoin Mutinynet',
      },
      [BtcScope.Regtest]: {
        decimals: MULTICHAIN_NETWORK_DECIMAL_PLACES[BtcScope.Regtest],
        imageSource: imageIcons['BTC-TESTNET'],
        ticker: MULTICHAIN_NETWORK_TICKER[BtcScope.Regtest],
        isTestnet: true,
      },
    };

    const networks: Record<CaipChainId, MultichainNetworkConfiguration> =
      multichainNetworkControllerState.multichainNetworkConfigurationsByChainId ||
      {};

    const NON_EVM_CAIP_CHAIN_IDS: CaipChainId[] = [
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      BtcScope.Mainnet,
      BtcScope.Testnet,
      BtcScope.Signet,
      ///: END:ONLY_INCLUDE_IF
      SolScope.Mainnet,
    ];

    const nonEvmNetworks: Record<CaipChainId, MultichainNetworkConfiguration> =
      Object.keys(networks)
        .filter((key) => NON_EVM_CAIP_CHAIN_IDS.includes(key as CaipChainId))
        .reduce(
          (
            filteredNetworks: Record<
              CaipChainId,
              MultichainNetworkConfiguration
            >,
            key: string,
          ) => {
            // @ts-expect-error - key is typed as string because that is the type of Object.keys but we know it is a CaipChainId
            filteredNetworks[key] = networks[key];
            return filteredNetworks;
          },
          {},
        );

    return Object.fromEntries(
      Object.entries(nonEvmNetworks).map(([key, network]) => [
        key,
        { ...network, ...extendedNonEvmData[network.chainId] },
      ]),
    );
  },
);

export const selectSelectedNonEvmNetworkDecimals = createSelector(
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
  (nonEvmNetworkConfigurationsByChainId, selectedMultichainNetworkChainId) =>
    nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId]
      ?.decimals,
);

export const selectSelectedNonEvmNetworkName = createSelector(
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
  (nonEvmNetworkConfigurationsByChainId, selectedMultichainNetworkChainId) => {
    const network =
      nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId];
    return network?.name;
  },
);

export const selectSelectedNonEvmNativeCurrency = createSelector(
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
  (nonEvmNetworkConfigurationsByChainId, selectedMultichainNetworkChainId) => {
    const network =
      nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId];
    return network?.nativeCurrency;
  },
);

export const selectSelectedNonEvmNetworkSymbol = createSelector(
  selectSelectedNonEvmNetworkChainId,
  selectNonEvmNetworkConfigurationsByChainId,
  (selectedMultichainNetworkChainId, nonEvmNetworkConfigurationsByChainId) =>
    nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId]
      ?.ticker,
);

export const selectNetworksWithActivity = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    multichainNetworkControllerState.networksWithTransactionActivity,
);

export const getActiveNetworksByScopes = createDeepEqualSelector(
  [
    selectNetworksWithActivity,
    (_state: RootState, account: { address: string; scopes: CaipChainId[] }) =>
      account,
  ],
  (networksWithTransactionActivity, account): { caipChainId: string }[] => {
    if (!account?.scopes?.length) {
      return [];
    }

    const chainsWithActivityByAddress =
      networksWithTransactionActivity[account?.address.toLowerCase()]
        ?.activeChains;

    if (account.scopes.includes(EthScope.Eoa) && chainsWithActivityByAddress) {
      return chainsWithActivityByAddress.map((chainNumber) => {
        const caipChainId = toHex(chainNumber);
        return {
          caipChainId,
        };
      });
    }

    if (account.scopes.includes(SolScope.Mainnet)) {
      return [
        {
          caipChainId: SolScope.Mainnet,
        },
      ];
    }

    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    if (account.scopes.includes(BtcScope.Mainnet)) {
      return [
        {
          caipChainId: BtcScope.Mainnet,
        },
      ];
    }
    if (account.scopes.includes(BtcScope.Testnet)) {
      return [
        {
          caipChainId: BtcScope.Testnet,
        },
      ];
    }
    if (account.scopes.includes(BtcScope.Testnet4)) {
      return [
        {
          caipChainId: BtcScope.Testnet4,
        },
      ];
    }
    if (account.scopes.includes(BtcScope.Signet)) {
      return [
        {
          caipChainId: BtcScope.Signet,
        },
      ];
    }
    if (account.scopes.includes(BtcScope.Regtest)) {
      return [
        {
          caipChainId: BtcScope.Regtest,
        },
      ];
    }
    ///: END:ONLY_INCLUDE_IF(bitcoin)

    return [];
  },
);
