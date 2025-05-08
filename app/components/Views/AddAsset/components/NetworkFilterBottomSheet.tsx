import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { VerticalAlignment } from '../../../../component-library/components/List/ListItem';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import styleSheet from '../AddAsset.styles';
import { FilterOption } from '../AddAsset';
import { useSelector } from 'react-redux';
import { selectTokenNetworkFilter } from '../../../../selectors/preferencesController';
import { useStyles } from '../../../hooks/useStyles';
import NetworkImageComponent from '../../../UI/NetworkImages';
import {
  selectAllPopularNetworkConfigurations,
  selectEvmChainId,
} from '../../../../selectors/networkController';
import { enableAllNetworksFilter } from '../../../UI/Tokens/util/enableAllNetworksFilter';

export const NETWORK_FILTER_BOTTOM_SHEET = 'NETWORK_FILTER_BOTTOM_SHEET';
export default function NetworkFilterBottomSheet({
  onFilterControlsBottomSheetPress,
  setOpenNetworkFilter,
  sheetRef,
}: {
  onFilterControlsBottomSheetPress: (option: FilterOption) => void;
  setOpenNetworkFilter: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
}) {
  const { styles } = useStyles(styleSheet, {});

  const allNetworks = useSelector(selectAllPopularNetworkConfigurations);
  const allNetworksEnabled = useMemo(
    () => enableAllNetworksFilter(allNetworks),
    [allNetworks],
  );
  const isAllNetworksEnabled = useSelector(selectTokenNetworkFilter);
  const chainId = useSelector(selectEvmChainId);

  return (
    <BottomSheet
      shouldNavigateBack={false}
      ref={sheetRef}
      onClose={() => setOpenNetworkFilter(false)}
      isInteractable
      testID={NETWORK_FILTER_BOTTOM_SHEET}
    >
      <View style={styles.bottomSheetWrapper}>
        <Text variant={TextVariant.HeadingMD} style={styles.bottomSheetTitle}>
          {strings('wallet.filter_by')}
        </Text>
        <ListItemSelect
          testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_ALL}
          onPress={() => {
            onFilterControlsBottomSheetPress(FilterOption.AllNetworks);
            setOpenNetworkFilter(false);
          }}
          isSelected={
            isAllNetworksEnabled && Object.keys(isAllNetworksEnabled).length > 1
          }
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.popular_networks')}
          </Text>
          <View style={styles.networkImageContainer}>
            <NetworkImageComponent
              isAllNetworksEnabled
              allNetworksEnabled={allNetworksEnabled}
              selectorButtonDisplayed={false}
            />
          </View>
        </ListItemSelect>
        <ListItemSelect
          testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_CURRENT}
          onPress={() => {
            onFilterControlsBottomSheetPress(FilterOption.CurrentNetwork);
            setOpenNetworkFilter(false);
          }}
          isSelected={
            isAllNetworksEnabled &&
            Object.keys(isAllNetworksEnabled).length === 1
          }
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.current_network')}
          </Text>
          <View style={styles.networkImageContainer}>
            <NetworkImageComponent
              isAllNetworksEnabled={false}
              allNetworksEnabled={{ [chainId]: true }}
              selectorButtonDisplayed={false}
            />
          </View>
        </ListItemSelect>
      </View>
    </BottomSheet>
  );
}
