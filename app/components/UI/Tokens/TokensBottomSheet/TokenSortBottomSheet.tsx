<<<<<<< HEAD
import React from 'react';
=======
import React, { useRef } from 'react';
>>>>>>> main
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import createStyles from '../styles';
import { strings } from '../../../../../locales/i18n';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
<<<<<<< HEAD
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
=======
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
>>>>>>> main
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import currencySymbols from '../../../../util/currency-symbols.json';
<<<<<<< HEAD
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';

const TokenSortBottomSheet = () => {
=======
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../component-library/components/List/ListItem';

enum SortOption {
  FiatAmount = 0,
  Alphabetical = 1,
}

const TokenSortBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
>>>>>>> main
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const currentCurrency = useSelector(selectCurrentCurrency);

<<<<<<< HEAD
  const onSortControlsBottomSheetPress = (index: number) => {
    const { PreferencesController } = Engine.context;
    switch (index) {
      case 0:
=======
  const onSortControlsBottomSheetPress = (option: SortOption) => {
    const { PreferencesController } = Engine.context;
    switch (option) {
      case SortOption.FiatAmount:
>>>>>>> main
        PreferencesController.setTokenSortConfig({
          key: 'tokenFiatAmount',
          order: 'dsc',
          sortCallback: 'stringNumeric',
        });
<<<<<<< HEAD
        break;
      case 1:
=======
        sheetRef.current?.onCloseBottomSheet();
        break;
      case SortOption.Alphabetical:
>>>>>>> main
        PreferencesController.setTokenSortConfig({
          key: 'symbol',
          sortCallback: 'alphaNumeric',
          order: 'asc',
        });
<<<<<<< HEAD
=======
        sheetRef.current?.onCloseBottomSheet();
>>>>>>> main
        break;
      default:
        break;
    }
  };

  return (
<<<<<<< HEAD
    <BottomSheet shouldNavigateBack>
=======
    <BottomSheet shouldNavigateBack ref={sheetRef}>
>>>>>>> main
      <View style={styles.bottomSheetWrapper}>
        <Text
          testID={WalletViewSelectorsIDs.SORT_BY}
          variant={TextVariant.HeadingMD}
          style={styles.bottomSheetTitle}
        >
          {strings('wallet.sort_by')}
        </Text>
<<<<<<< HEAD
        <Cell
          testID={WalletViewSelectorsIDs.SORT_DECLINING_BALANCE}
          variant={CellVariant.Select}
          title={strings('wallet.declining_balance', {
            currency:
              currencySymbols[
                currentCurrency as keyof typeof currencySymbols
              ] ?? currentCurrency,
          })}
          isSelected={tokenSortConfig.key === 'tokenFiatAmount'}
          onPress={() => onSortControlsBottomSheetPress(0)}
        />
        <Cell
          testID={WalletViewSelectorsIDs.SORT_ALPHABETICAL}
          variant={CellVariant.Select}
          title={strings('wallet.alphabetically')}
          isSelected={tokenSortConfig.key !== 'tokenFiatAmount'}
          onPress={() => onSortControlsBottomSheetPress(1)}
        />
=======
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
>>>>>>> main
      </View>
    </BottomSheet>
  );
};

export default TokenSortBottomSheet;
