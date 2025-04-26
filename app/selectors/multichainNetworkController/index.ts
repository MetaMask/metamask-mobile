import { MultichainNetworkControllerState } from '@metamask/multichain-network-controller';
import { RootState } from '../../reducers';
import { createSelector } from 'reselect';
import { CaipChainId } from '@metamask/utils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import imageIcons from '../../images/image-icons';
import { ImageSourcePropType } from 'react-native';
import { createDeepEqualSelector } from '../util';

export const selectMultichainNetworkControllerState = (state: RootState) =>
  state.engine.backgroundState?.MultichainNetworkController;

export const selectIsEvmNetworkSelected = createDeepEqualSelector(
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
      }
    > = {
      [SolScope.Mainnet]: {
        decimals: 9,
        imageSource: imageIcons.SOLANA,
        ticker: 'SOL',
      },
      [BtcScope.Mainnet]: {
        decimals: 8,
        imageSource: imageIcons.BTC,
        ticker: 'BTC',
      },
    };
    return Object.fromEntries(
      Object.entries(
        multichainNetworkControllerState.multichainNetworkConfigurationsByChainId ||
          {},
      ).map(([key, network]) => [
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
