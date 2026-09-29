import type { ImageSourcePropType } from 'react-native';
import type { InfuraNetworkType } from '@metamask/controller-utils';
import type { NetworkConfiguration } from '@metamask/network-controller';
import type { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import type { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { ExtendedNetwork } from '../../Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';

export type NonEvmNetworkListConfiguration = MultichainNetworkConfiguration & {
  imageSource: ImageSourcePropType;
  isTestnet: boolean;
};

export type NetworkSelectorListItem =
  | { type: 'enabledNetworksHeader'; key: 'enabled-networks-header' }
  | { type: 'mainnet'; key: 'mainnet' }
  | { type: 'lineaMainnet'; key: 'linea-mainnet' }
  | {
      type: 'rpcNetwork';
      key: string;
      networkConfiguration: NetworkConfiguration;
    }
  | {
      type: 'nonEvmNetwork';
      key: string;
      networkConfiguration: NonEvmNetworkListConfiguration;
    }
  | { type: 'popularNetworksHeader'; key: 'popular-networks-header' }
  | { type: 'additionalNetworks'; key: 'additional-networks' }
  | { type: 'testNetworksSwitch'; key: 'test-networks-switch' }
  | {
      type: 'otherNetwork';
      key: string;
      networkType: InfuraNetworkType;
    };

export interface NetworkSelectorListProps {
  networkConfigurations: Record<Hex, NetworkConfiguration>;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  nonEvmNetworkConfigurations: Record<
    CaipChainId,
    NonEvmNetworkListConfiguration
  >;
  ///: END:ONLY_INCLUDE_IF
  searchString: string;
  showTestNetworks: boolean;
  isSendFlow: boolean;
  isRedesignEnabled: boolean;
  showRpcSelector: boolean;
  selectedChainId: Hex;
  selectedRpcUrl?: string;
  isEvmSelected: boolean;
  isHardwareWallet: boolean;
  avatarSize?: AvatarSize;
  showPopularNetworkModal: boolean;
  popularNetwork?: ExtendedNetwork;
  isGasFeesSponsoredNetworkEnabled: (chainId: Hex) => boolean;
  isNetworkSelected: (chainId: Hex | CaipChainId) => boolean;
  onSetRpcTarget: (networkConfiguration: NetworkConfiguration) => Promise<void>;
  onNetworkChange: (networkType: InfuraNetworkType) => Promise<void>;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  onNonEvmNetworkChange: (chainId: CaipChainId) => Promise<void>;
  ///: END:ONLY_INCLUDE_IF
  openModal: (
    chainId: Hex,
    displayEdit: boolean,
    networkTypeOrRpcUrl: string,
    isReadOnly: boolean,
  ) => void;
  openRpcModal: ({
    chainId,
    networkName,
  }: {
    chainId: Hex;
    networkName: string;
  }) => void;
  onCancel: () => void;
  toggleWarningModal: () => void;
  showNetworkModal: (networkConfiguration: ExtendedNetwork) => void;
  handleAddPopularNetwork: (
    networkConfiguration: ExtendedNetwork,
  ) => Promise<void>;
}
