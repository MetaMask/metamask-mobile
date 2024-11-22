import React, { useRef } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import createStyles from '../styles';
import { strings } from '../../../../../locales/i18n';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import currencySymbols from '../../../../util/currency-symbols.json';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../component-library/components/List/ListItem';

enum SortOption {
  FiatAmount = 0,
  Alphabetical = 1,
}

const TokenSortBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const onSortControlsBottomSheetPress = (option: SortOption) => {
    const { PreferencesController } = Engine.context;
    switch (option) {
      case SortOption.FiatAmount:
        PreferencesController.setTokenSortConfig({
          key: 'tokenFiatAmount',
          order: 'dsc',
          sortCallback: 'stringNumeric',
        });
        sheetRef.current?.onCloseBottomSheet();
        break;
      case SortOption.Alphabetical:
        PreferencesController.setTokenSortConfig({
          key: 'symbol',
          sortCallback: 'alphaNumeric',
          order: 'asc',
        });
        sheetRef.current?.onCloseBottomSheet();
        break;
      default:
        break;
    }
  };

  return (
    <BottomSheet shouldNavigateBack ref={sheetRef}>
      <View style={styles.bottomSheetWrapper}>
        <Text
          testID={WalletViewSelectorsIDs.SORT_BY}
          variant={TextVariant.HeadingMD}
          style={styles.bottomSheetTitle}
        >
          {strings('wallet.sort_by')}
        </Text>
        <ListItemSelect
          testID={WalletViewSelectorsIDs.SORT_DECLINING_BALANCE}
          onPress={() => onSortControlsBottomSheetPress(SortOption.FiatAmount)}
          isSelected={tokenSortConfig.key === 'tokenFiatAmount'}
          isDisabled={false}
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.declining_balance', {
              currency:
                currencySymbols[
                  currentCurrency as keyof typeof currencySymbols
                ] ?? currentCurrency,
            })}
          </Text>
        </ListItemSelect>
        <ListItemSelect
          testID={WalletViewSelectorsIDs.SORT_ALPHABETICAL}
          onPress={() =>
            onSortControlsBottomSheetPress(SortOption.Alphabetical)
          }
          isSelected={tokenSortConfig.key !== 'tokenFiatAmount'}
          isDisabled={false}
          gap={8}
          verticalAlignment={VerticalAlignment.Center}
        >
          <Text style={styles.bottomSheetText}>
            {strings('wallet.alphabetically')}
          </Text>
        </ListItemSelect>
      </View>
    </BottomSheet>
  );
};

export { TokenSortBottomSheet };
