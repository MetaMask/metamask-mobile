import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import createStyles from '../styles';
import { strings } from '../../../../../locales/i18n';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import currencySymbols from '../../../../util/currency-symbols.json';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';

const TokenSortBottomSheet = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const onSortControlsActionSheetPress = (index: number) => {
    const { PreferencesController } = Engine.context;
    switch (index) {
      case 0:
        PreferencesController.setTokenSortConfig({
          key: 'tokenFiatAmount',
          order: 'dsc',
          sortCallback: 'stringNumeric',
        });
        break;
      case 1:
        PreferencesController.setTokenSortConfig({
          key: 'symbol',
          sortCallback: 'alphaNumeric',
          order: 'asc',
        });
        break;
      default:
        break;
    }
  };

  return (
    <BottomSheet shouldNavigateBack>
      <View style={styles.bottomSheetWrapper}>
        <Text variant={TextVariant.HeadingMD} style={styles.bottomSheetTitle}>
          Sort By
        </Text>
        <Cell
          variant={CellVariant.Select}
          title={strings('wallet.declining_balance', {
            currency:
              currencySymbols[
                currentCurrency as keyof typeof currencySymbols
              ] ?? currentCurrency,
          })}
          isSelected={tokenSortConfig.key === 'tokenFiatAmount'}
          onPress={() => onSortControlsActionSheetPress(0)}
        />
        <Cell
          variant={CellVariant.Select}
          title={strings('wallet.alphabetically')}
          isSelected={tokenSortConfig.key !== 'tokenFiatAmount'}
          onPress={() => onSortControlsActionSheetPress(1)}
        />
      </View>
    </BottomSheet>
  );
};

export default TokenSortBottomSheet;
