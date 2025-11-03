import React, { FC, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Hex } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text from '../../../../component-library/components/Texts/Text/Text';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import Networks, { getNetworkImageSource } from '../../../../util/networks';
import { strings } from '../../../../../locales/i18n';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import images from 'images/image-icons';
import hideProtocolFromUrl from '../../../../util/hideProtocolFromUrl';
import hideKeyFromUrl from '../../../../util/hideKeyFromUrl';
import { NetworkConfiguration } from '@metamask/network-controller';
import { useSelector } from 'react-redux';
import { selectIsAllNetworks } from '../../../../selectors/networkController';
import Engine from '../../../../core/Engine/Engine';
import Logger from '../../../../util/Logger';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  NetworkType,
  useNetworksByNamespace,
} from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../../hooks/useNetworkSelection/useNetworkSelection';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../../constants/popular-networks';

interface RpcSelectionModalProps {
  showMultiRpcSelectModal: {
    isVisible: boolean;
    chainId: string;
    networkName: string;
  };
  closeRpcModal: () => void;
  rpcMenuSheetRef: React.RefObject<BottomSheetRef>;
  networkConfigurations: Record<string, NetworkConfiguration>;
  styles: StyleSheet.NamedStyles<{
    baseHeader: unknown;
    alternativeText: unknown;
    cellBorder: unknown;
    rpcMenu: unknown;
    rpcText: unknown;
    textCentred: unknown;
  }>;
}

const RpcSelectionModal: FC<RpcSelectionModalProps> = ({
  showMultiRpcSelectModal,
  closeRpcModal,
  rpcMenuSheetRef,
  networkConfigurations,
  styles,
}) => {
  const isAllNetwork = useSelector(selectIsAllNetworks);
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });
  const { navigate } = useNavigation();

  const onRpcSelect = useCallback(
    async (clientId: string, chainId: `0x${string}`) => {
      const { NetworkController, MultichainNetworkController } = Engine.context;
      const existingNetwork = networkConfigurations[chainId];

      const indexOfRpc = existingNetwork.rpcEndpoints.findIndex(
        ({ networkClientId }) => clientId === networkClientId,
      );

      if (indexOfRpc === -1) {
        Logger.error(
          new Error(
            `RPC endpoint with clientId: ${clientId} not found for chainId: ${chainId}`,
          ),
        );
        return;
      }

      // Proceed to update the network with the correct index
      await NetworkController.updateNetwork(existingNetwork.chainId, {
        ...existingNetwork,
        defaultRpcEndpointIndex: indexOfRpc,
      });

      // Set the active network
      MultichainNetworkController.setActiveNetwork(clientId);
      // Redirect to wallet page
      navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    },
    [networkConfigurations, navigate],
  );

  const setTokenNetworkFilter = useCallback(
    (chainId: Hex) => {
      const isPopularNetwork = POPULAR_NETWORK_CHAIN_IDS.has(chainId);

      const { PreferencesController } = Engine.context;
      if (!isAllNetwork && isPopularNetwork) {
        PreferencesController.setTokenNetworkFilter({
          [chainId]: true,
        });
      }
      const caipChainId = formatChainIdToCaip(chainId);
      selectNetwork(caipChainId);
    },
    [isAllNetwork, selectNetwork],
  );
  const imageSource = useMemo(() => {
    switch (showMultiRpcSelectModal.chainId) {
      case CHAIN_IDS.MAINNET:
        return images.ETHEREUM;
      case CHAIN_IDS.LINEA_MAINNET:
        return images['LINEA-MAINNET'];
      default:
        return getNetworkImageSource({
          chainId: showMultiRpcSelectModal?.chainId?.toString(),
        });
    }
  }, [showMultiRpcSelectModal.chainId]);

  const handleRpcSelect = useCallback(
    (networkClientId: string, chainIdArg: `0x${string}`) => {
      onRpcSelect(networkClientId, chainIdArg);
      setTokenNetworkFilter(chainIdArg);
      selectNetwork(chainIdArg);
      closeRpcModal();
    },
    [onRpcSelect, setTokenNetworkFilter, closeRpcModal, selectNetwork],
  );

  if (!showMultiRpcSelectModal.isVisible) return null;

  const chainId = showMultiRpcSelectModal.chainId;
  const rpcEndpoints =
    networkConfigurations[chainId as `0x${string}`]?.rpcEndpoints || [];

  return (
    <BottomSheet
      ref={rpcMenuSheetRef}
      onClose={closeRpcModal}
      shouldNavigateBack={false}
    >
      {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382 */}
      <BottomSheetHeader style={styles.baseHeader}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('app_settings.select_rpc_url')}{' '}
        </Text>
        <Cell
          variant={CellVariant.Display}
          title={Networks.mainnet.name}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: showMultiRpcSelectModal.networkName,
            imageSource,
            size: AvatarSize.Sm,
            style: { marginRight: 0 },
          }}
          // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
          // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
          style={styles.cellBorder}
        >
          <Text
            // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
            // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
            style={styles.alternativeText}
            variant={TextVariant.BodyMD}
          >
            {showMultiRpcSelectModal.networkName}
          </Text>
        </Cell>
      </BottomSheetHeader>
      {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382 */}
      <View style={styles.rpcMenu}>
        {rpcEndpoints.map(
          ({
            url,
            networkClientId,
          }: {
            url: string;
            networkClientId: string;
          }) => (
            <ListItemSelect
              key={networkClientId}
              isSelected={
                networkClientId ===
                rpcEndpoints[
                  networkConfigurations[chainId as `0x${string}`]
                    .defaultRpcEndpointIndex
                ].networkClientId
              }
              isDisabled={false}
              gap={8}
              onPress={() =>
                handleRpcSelect(networkClientId, chainId as `0x${string}`)
              }
            >
              {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382 */}
              <View style={styles.rpcText}>
                {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382 */}
                <Text style={styles.textCentred}>
                  {hideKeyFromUrl(hideProtocolFromUrl(url))}
                </Text>
              </View>
            </ListItemSelect>
          ),
        )}
      </View>
    </BottomSheet>
  );
};

export default RpcSelectionModal;
