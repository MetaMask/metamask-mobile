import React, { FC, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { PopularList } from '../../../../util/networks/customNetworks';
import Engine from '../../../../core/Engine/Engine';
import Logger from '../../../../util/Logger';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

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
    (chainId: string) => {
      const isPopularNetwork =
        chainId === CHAIN_IDS.MAINNET ||
        chainId === CHAIN_IDS.LINEA_MAINNET ||
        PopularList.some((network) => network.chainId === chainId);

      const { PreferencesController } = Engine.context;
      if (!isAllNetwork && isPopularNetwork) {
        PreferencesController.setTokenNetworkFilter({
          [chainId]: true,
        });
      }
    },
    [isAllNetwork],
  );
  const imageSource = useMemo(() => {
    switch (showMultiRpcSelectModal.chainId) {
      case CHAIN_IDS.MAINNET:
        return images.ETHEREUM;
      case CHAIN_IDS.LINEA_MAINNET:
        return images['LINEA-MAINNET'];
      default:
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        return getNetworkImageSource({
          chainId: showMultiRpcSelectModal?.chainId?.toString(),
        });
    }
  }, [showMultiRpcSelectModal.chainId]);

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
          style={styles.cellBorder}
        >
          <Text style={styles.alternativeText} variant={TextVariant.BodyMD}>
            {showMultiRpcSelectModal.networkName}
          </Text>
        </Cell>
      </BottomSheetHeader>
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
              onPress={() => {
                onRpcSelect(networkClientId, chainId as `0x${string}`);
                setTokenNetworkFilter(chainId as `0x${string}`);
                closeRpcModal();
              }}
            >
              <View style={styles.rpcText}>
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
