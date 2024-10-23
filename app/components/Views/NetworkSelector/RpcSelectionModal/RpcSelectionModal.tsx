import React, { FC, useMemo } from 'react';
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

interface RpcSelectionModalProps {
  showMultiRpcSelectModal: {
    isVisible: boolean;
    chainId: string;
    networkName: string;
  };
  closeRpcModal: () => void;
  onRpcSelect: (networkClientId: string, chainId: `0x${string}`) => void;
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
  onRpcSelect,
  rpcMenuSheetRef,
  networkConfigurations,
  styles,
}) => {
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
