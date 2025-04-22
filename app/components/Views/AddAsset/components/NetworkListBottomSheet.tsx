import React from 'react';
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
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { Hex } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../util/networks';

export const NETWORK_LIST_BOTTOM_SHEET = 'NETWORK_LIST_BOTTOM_SHEET';

export default function NetworkListBottomSheet({
  selectedNetwork,
  setSelectedNetwork,
  setOpenNetworkSelector,
  sheetRef,
}: {
  selectedNetwork: Hex | null;
  setSelectedNetwork: (network: Hex) => void;
  setOpenNetworkSelector: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
}) {
  const { styles } = useStyles(styleSheet, {});
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={() => setOpenNetworkSelector(false)}
      isInteractable
      style={styles.bottomSheetWrapperContent}
      testID={NETWORK_LIST_BOTTOM_SHEET}
    >
      <Text variant={TextVariant.HeadingMD} style={styles.bottomSheetTitle}>
        {strings('networks.select_network')}
      </Text>
      <ScrollView>
        {Object.values(networkConfigurations).map((network) => (
          <View style={styles.bottomSheetWrapper} key={network.chainId}>
            <Cell
              testID={network.name}
              variant={CellVariant.Select}
              title={network.name}
              avatarProps={{
                variant: AvatarVariant.Network,
                name: network.name,
                // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
                imageSource: getNetworkImageSource({
                  chainId: network.chainId,
                }),
                size: AvatarSize.Sm,
              }}
              onPress={() => {
                setSelectedNetwork(network.chainId);
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
