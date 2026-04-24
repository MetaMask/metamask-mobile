import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn from '../../../../../component-library/components/List/ListItemColumn';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { useMusdConversionFlowData } from '../../../Earn/hooks/useMusdConversionFlowData';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../../Earn/types/musd.types';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { createStyles } from './MoneyAddMoneySheet.styles';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';

interface Option {
  label: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
}

const MoneyAddMoneySheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const theme = useTheme();
  const styles = createStyles(theme);

  const { musdFiatFormatted } = useMoneyAccountBalance();
  const { initiateCustomConversion } = useMusdConversion();
  const { getPaymentTokenForSelectedNetwork } = useMusdConversionFlowData();
  const { goToBuy } = useRampNavigation();

  const closeAndNavigate = useCallback((navigateFn: () => void) => {
    sheetRef.current?.onCloseBottomSheet(navigateFn);
  }, []);

  // TODO(MUSD-478/MUSD-516): point to the MM Pay "Add money" amount-entry
  // screen (Figma 2547:8887). Interim: existing mUSD quick-convert token list.
  const handleConvertCrypto = useCallback(() => {
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

  // TODO(MUSD-479): point to the Ramps "Add funds" amount-entry screen
  // (Figma 2547:8780). Interim: unified smart-routed Buy flow.
  const handleDepositFunds = useCallback(() => {
    closeAndNavigate(() => {
      goToBuy();
    });
  }, [closeAndNavigate, goToBuy]);

  // TODO: wire to the "move external mUSD → Money Account" flow once the
  // dedicated ticket lands. Interim: close sheet.
  const handleMoveMusd = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const options: Option[] = [
    {
      label: strings('money.add_money_sheet.convert_crypto'),
      icon: IconName.Refresh,
      onPress: handleConvertCrypto,
      testID: MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
    },
    {
      label: strings('money.add_money_sheet.deposit_funds'),
      icon: IconName.Money,
      onPress: handleDepositFunds,
      testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    },
    {
      label: musdFiatFormatted
        ? strings('money.add_money_sheet.move_musd', {
            amount: musdFiatFormatted,
          })
        : strings('money.add_money_sheet.move_musd_no_amount'),
      icon: IconName.Add,
      onPress: handleMoveMusd,
      testID: MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
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
              <Icon
                name={item.icon}
                size={IconSize.Lg}
                color={IconColor.IconDefault}
              />
            </ListItemColumn>
            <ListItemColumn>
              <Text variant={TextVariant.BodyMDMedium}>{item.label}</Text>
            </ListItemColumn>
          </ListItemSelect>
        )}
        keyExtractor={(item) => item.testID}
      />
      <View
        style={styles.disabledRow}
        testID={MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW}
      >
        <Icon
          name={IconName.Received}
          size={IconSize.Lg}
          color={IconColor.IconMuted}
        />
        <View style={styles.disabledRowContent}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            {strings('money.add_money_sheet.receive_external')}
          </Text>
          <Tag label={strings('money.add_money_sheet.coming_soon')} />
        </View>
      </View>
    </BottomSheet>
  );
};

export default MoneyAddMoneySheet;
