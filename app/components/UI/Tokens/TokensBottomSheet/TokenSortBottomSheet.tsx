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
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import ListItemSelect from '../../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../../component-library/components/List/ListItem';

const TokenSortBottomSheet = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const onSortControlsBottomSheetPress = (index: number) => {
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
        <Text
          testID={WalletViewSelectorsIDs.SORT_BY}
          variant={TextVariant.HeadingMD}
          style={styles.bottomSheetTitle}
        >
          {strings('wallet.sort_by')}
        </Text>
        <ListItemSelect
          testID={WalletViewSelectorsIDs.SORT_DECLINING_BALANCE}
          onPress={() => onSortControlsBottomSheetPress(0)}
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
          onPress={() => onSortControlsBottomSheetPress(1)}
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

export default TokenSortBottomSheet;
