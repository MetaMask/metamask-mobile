import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
  Label,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn from '../../../../../component-library/components/List/ListItemColumn';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { useMusdConversionFlowData } from '../../../Earn/hooks/useMusdConversionFlowData';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../../Earn/types/musd.types';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { createStyles } from './MoneyAddMoneySheet.styles';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

const MoneyAddMoneySheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const theme = useTheme();
  const styles = createStyles(theme);

  const { initiateCustomConversion } = useMusdConversion();
  const { getPaymentTokenForSelectedNetwork } = useMusdConversionFlowData();
  const { goToBuy } = useRampNavigation();

  const closeAndNavigate = useCallback((navigateFn: () => void) => {
    sheetRef.current?.onCloseBottomSheet(navigateFn);
  }, []);

  // TODO(MUSD-478/MUSD-516): Replace with the MM Pay "Add money" amount-entry
  // screen (Figma 2547:8887) once that screen lands. Interim: the existing
  // mUSD quick-convert token list.
  const handleConvertTokens = useCallback(() => {
    const paymentToken = getPaymentTokenForSelectedNetwork();
    if (!paymentToken) {
      Logger.error(new Error('[MoneyAddMoneySheet] payment token missing'));
      sheetRef.current?.onCloseBottomSheet();
      return;
    }
    closeAndNavigate(() => {
      initiateCustomConversion({
        preferredPaymentToken: paymentToken,
        navigationOverride: MUSD_CONVERSION_NAVIGATION_OVERRIDE.QUICK_CONVERT,
      }).catch((error) => {
        Logger.error(error as Error, '[MoneyAddMoneySheet] conversion failed');
      });
    });
  }, [
    closeAndNavigate,
    getPaymentTokenForSelectedNetwork,
    initiateCustomConversion,
  ]);

  // TODO(MUSD-479): Route to the Ramps "Add funds" amount-entry screen
  // (Figma 2547:8780) once that screen lands. Interim: the unified
  // smart-routed Buy flow.
  const handleBuyWithFiat = useCallback(() => {
    closeAndNavigate(() => {
      goToBuy();
    });
  }, [closeAndNavigate, goToBuy]);

  const options = [
    {
      label: strings('money.add_money_sheet.convert_tokens'),
      description: strings('money.add_money_sheet.convert_tokens_description'),
      icon: IconName.SwapHorizontal,
      onPress: handleConvertTokens,
      testID: MoneyAddMoneySheetTestIds.CONVERT_TOKENS_OPTION,
    },
    {
      label: strings('money.add_money_sheet.buy_with_fiat'),
      description: strings('money.add_money_sheet.buy_with_fiat_description'),
      icon: IconName.Card,
      onPress: handleBuyWithFiat,
      testID: MoneyAddMoneySheetTestIds.BUY_WITH_FIAT_OPTION,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      testID={MoneyAddMoneySheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('money.add_money_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <FlatList
        scrollEnabled={false}
        data={options}
        renderItem={({ item }) => (
          <ListItemSelect onPress={item.onPress} testID={item.testID}>
            <ListItemColumn>
              <View style={styles.iconContainer}>
                <Icon
                  name={item.icon}
                  size={IconSize.Md}
                  color={IconColor.PrimaryDefault}
                />
              </View>
            </ListItemColumn>
            <ListItemColumn>
              <Label>{item.label}</Label>
              <Text
                variant={TextVariant.BodySM}
                color={theme.colors.text.alternative}
              >
                {item.description}
              </Text>
            </ListItemColumn>
          </ListItemSelect>
        )}
        keyExtractor={(item) => item.label}
      />
    </BottomSheet>
  );
};

export default MoneyAddMoneySheet;
