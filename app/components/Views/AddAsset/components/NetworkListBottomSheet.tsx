import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import styleSheet from '../AddAsset.styles';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../hooks/useStyles';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { Hex } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../util/networks';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';

export const NETWORK_LIST_BOTTOM_SHEET = 'NETWORK_LIST_BOTTOM_SHEET';

export default function NetworkListBottomSheet({
  selectedNetwork,
  setSelectedNetwork,
  setOpenNetworkSelector,
  sheetRef,
  displayEvmNetworksOnly = true,
}: {
  selectedNetwork: Hex | null;
  setSelectedNetwork: (network: Hex) => void;
  setOpenNetworkSelector: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
  displayEvmNetworksOnly?: boolean;
}) {
  const { styles } = useStyles(styleSheet, {});
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const filteredNetworkConfigurations = useMemo(() => {
    const configs = {} as Record<string, MultichainNetworkConfiguration>;

    for (const [chainId, config] of Object.entries(networkConfigurations)) {
      // If displayEvmNetworksOnly is true, filter out non-EVM networks
      const shouldBeFilteredOut =
        displayEvmNetworksOnly &&
        ((Object.hasOwnProperty.call(config, 'isEvm') && !config.isEvm) ||
          config.isEvm === false);

      if (shouldBeFilteredOut) {
        continue;
      }

      configs[chainId] = config;
    }

    return configs;
  }, [displayEvmNetworksOnly, networkConfigurations]);

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      isInteractable={false}
      onClose={() => setOpenNetworkSelector(false)}
      style={styles.bottomSheetWrapperContent}
      testID={NETWORK_LIST_BOTTOM_SHEET}
    >
      <BottomSheetHeader onClose={() => setOpenNetworkSelector(false)}>
        <Text variant={TextVariant.HeadingMD} style={styles.bottomSheetTitle}>
          {strings('networks.select_network')}
        </Text>
      </BottomSheetHeader>

      <ScrollView>
        {Object.values(filteredNetworkConfigurations).map((network) => (
          <View style={styles.bottomSheetWrapper} key={network.chainId}>
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
              onPress={() => {
                setSelectedNetwork(network.chainId as Hex);
                setOpenNetworkSelector(false);
              }}
              isSelected={selectedNetwork === network.chainId}
            />
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
