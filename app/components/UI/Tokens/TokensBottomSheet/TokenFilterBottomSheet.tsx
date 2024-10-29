import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../../selectors/preferencesController';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useTheme } from '../../../../util/theme';
import createStyles from '../styles';
import Engine from '../../../../core/Engine';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../component-library/components/List/ListItem';
import { strings } from '../../../../../locales/i18n';

enum FilterOption {
  AllNetworks = 0,
  CurrentNetwork = 1,
}

const TokenFilterBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const chainId = useSelector(selectChainId);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);

  const onFilterControlsBottomSheetPress = (option: FilterOption) => {
    const { PreferencesController } = Engine.context;
    switch (option) {
      case FilterOption.AllNetworks:
        PreferencesController.setTokenNetworkFilter({});
        sheetRef.current?.onCloseBottomSheet();
        break;
      case FilterOption.CurrentNetwork:
        PreferencesController.setTokenNetworkFilter({
          [chainId]: true,
        });
        sheetRef.current?.onCloseBottomSheet();
        break;
      default:
        break;
    }
  };

  const isSelectedNetwork = tokenNetworkFilter?.[chainId];

  return (
    <BottomSheet shouldNavigateBack ref={sheetRef}>
      <View style={styles.bottomSheetWrapper}>
        <Text variant={TextVariant.HeadingMD} style={styles.bottomSheetTitle}>
          {strings('wallet.filter_by')}
        </Text>
        <ListItemSelect
          onPress={() =>
            onFilterControlsBottomSheetPress(FilterOption.AllNetworks)
          }
          isSelected={!isSelectedNetwork}
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.all_networks')}
          </Text>
        </ListItemSelect>
        <ListItemSelect
          onPress={() =>
            onFilterControlsBottomSheetPress(FilterOption.CurrentNetwork)
          }
          isSelected={isSelectedNetwork}
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.current_network')}
          </Text>
        </ListItemSelect>
      </View>
    </BottomSheet>
  );
};

export { TokenFilterBottomSheet };
