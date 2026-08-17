import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import Device from '../../../../../util/device';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { CaipChainId, Hex } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  MultichainNetworkConfiguration,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';

export const NETWORK_LIST_BOTTOM_SHEET = 'NETWORK_LIST_BOTTOM_SHEET';

interface NetworkListRowProps {
  network: MultichainNetworkConfiguration;
  isSelected: boolean;
  onPress: (chainId: SupportedCaipChainId | Hex) => void;
}

const keyExtractor = (network: MultichainNetworkConfiguration) =>
  network.chainId;

function NetworkListRowComponent({
  network,
  isSelected,
  onPress,
}: NetworkListRowProps) {
  return (
    <Box twClassName="items-start">
      <Cell
        variant={CellVariant.Select}
        title={network.name}
        avatarProps={{
          variant: AvatarVariant.Network,
          name: network.name,
          imageSource: getNetworkImageSource({
            chainId: network.chainId,
          }),
          size: AvatarSize.Sm,
        }}
        onPress={() => onPress(network.chainId as Hex)}
        isSelected={isSelected}
      />
    </Box>
  );
}

const NetworkListRow = React.memo(NetworkListRowComponent);

export default function NetworkListBottomSheet({
  selectedNetwork,
  setSelectedNetwork,
  setOpenNetworkSelector,
  sheetRef,
  displayEvmNetworksOnly = true,
}: {
  selectedNetwork: SupportedCaipChainId | Hex | null;
  setSelectedNetwork: (network: SupportedCaipChainId | Hex) => void;
  setOpenNetworkSelector: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef | null>;
  displayEvmNetworksOnly?: boolean;
}) {
  const tw = useTailwind();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const getAccountByScope = useSelector(selectSelectedInternalAccountByScope);

  const filteredNetworkConfigurations = useMemo(() => {
    const configs: MultichainNetworkConfiguration[] = [];

    for (const [chainId, config] of Object.entries(networkConfigurations)) {
      // If displayEvmNetworksOnly is true, filter out non-EVM networks
      const shouldBeFilteredOut =
        displayEvmNetworksOnly &&
        ((Object.hasOwnProperty.call(config, 'isEvm') && !config.isEvm) ||
          config.isEvm === false);

      if (shouldBeFilteredOut) {
        continue;
      }

      // Filter out non-EVM networks the current account group doesn't support
      if (
        isNonEvmChainId(chainId) &&
        !getAccountByScope(chainId as CaipChainId)
      ) {
        continue;
      }

      configs.push(config);
    }

    return configs;
  }, [displayEvmNetworksOnly, networkConfigurations, getAccountByScope]);

  const handleSelectNetwork = useCallback(
    (chainId: SupportedCaipChainId | Hex) => {
      setSelectedNetwork(chainId);
      sheetRef.current?.onCloseBottomSheet(() => {
        setOpenNetworkSelector(false);
      });
    },
    [setSelectedNetwork, setOpenNetworkSelector, sheetRef],
  );

  const renderItem = useCallback<
    ListRenderItem<MultichainNetworkConfiguration>
  >(
    ({ item }) => (
      <NetworkListRow
        network={item}
        isSelected={selectedNetwork === item.chainId}
        onPress={handleSelectNetwork}
      />
    ),
    [handleSelectNetwork, selectedNetwork],
  );

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={() => setOpenNetworkSelector(false)}
      testID={NETWORK_LIST_BOTTOM_SHEET}
    >
      <HeaderStandard
        title={strings('networks.select_network')}
        onClose={() => {
          sheetRef.current?.onCloseBottomSheet(() => {
            setOpenNetworkSelector(false);
          });
        }}
      />

      <Box
        style={tw.style(
          'grow shrink flex-row min-h-[200px]',
          `max-h-[${Math.round(Device.getDeviceHeight() * 0.7)}px]`,
        )}
      >
        <FlashList
          data={filteredNetworkConfigurations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          renderScrollComponent={ScrollView}
        />
      </Box>
    </BottomSheet>
  );
}
