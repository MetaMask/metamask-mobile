import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import Logger from '../../../../../util/Logger';
import styleSheet from './MoneyTransferSheet.styles';
import { MoneyTransferSheetTestIds } from './MoneyTransferSheet.testIds';

interface ActiveOption {
  label: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
}

interface DisabledOption {
  label: string;
  icon: IconName;
  testID: string;
}

const MoneyTransferSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTransfer = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      initiateWithdrawal().catch((error: Error) => {
        Logger.error(
          error,
          '[MoneyTransferSheet] Withdrawal initiation failed',
        );
      });
    });
  }, [initiateWithdrawal]);

  const activeOptions: ActiveOption[] = [
    {
      label: strings('money.transfer_sheet.between_accounts'),
      icon: IconName.SwapHorizontal,
      onPress: handleTransfer,
      testID: MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION,
    },
    {
      label: strings('money.transfer_sheet.perps_account'),
      icon: IconName.Candlestick,
      onPress: handleTransfer,
      testID: MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION,
    },
    {
      label: strings('money.transfer_sheet.predictions_account'),
      icon: IconName.Speedometer,
      onPress: handleTransfer,
      testID: MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION,
    },
  ];

  const disabledOptions: DisabledOption[] = [
    {
      label: strings('money.transfer_sheet.send_external'),
      icon: IconName.Send,
      testID: MoneyTransferSheetTestIds.SEND_EXTERNAL_ROW,
    },
    {
      label: strings('money.transfer_sheet.withdraw_to_bank'),
      icon: IconName.Bank,
      testID: MoneyTransferSheetTestIds.WITHDRAW_TO_BANK_ROW,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyTransferSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.transfer_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.list}>
        {activeOptions.map((item) => (
          <TouchableOpacity
            key={item.testID}
            onPress={item.onPress}
            style={styles.row}
            testID={item.testID}
          >
            <Icon
              name={item.icon}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
        {disabledOptions.map((item) => (
          <View key={item.testID} style={styles.row} testID={item.testID}>
            <Icon
              name={item.icon}
              size={IconSize.Lg}
              color={IconColor.IconMuted}
            />
            <View style={styles.disabledRowContent}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {item.label}
              </Text>
              <Tag
                label={strings('money.add_money_sheet.coming_soon')}
                style={styles.comingSoonTag}
              />
            </View>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
};

export default MoneyTransferSheet;
