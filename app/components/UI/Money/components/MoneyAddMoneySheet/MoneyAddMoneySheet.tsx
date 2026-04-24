import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Tag from '../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
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

  const { fiatBalanceAggregatedFormatted } = useMusdBalance();
  const musdAmountForLabel = fiatBalanceAggregatedFormatted?.replace(
    /^US\$/,
    '$',
  );
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
      icon: IconName.AttachMoney,
      onPress: handleDepositFunds,
      testID: MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    },
    {
      label: musdAmountForLabel
        ? strings('money.add_money_sheet.move_musd', {
            amount: musdAmountForLabel,
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
      <View style={styles.list}>
        {options.map((item) => (
          <TouchableOpacity
            key={item.testID}
            onPress={item.onPress}
            style={styles.row}
            testID={item.testID}
          >
            <Icon
              name={item.icon}
              size={IconSize.Lg}
              color={IconColor.Default}
            />
            <Text variant={TextVariant.BodyMDMedium}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <View
          style={styles.row}
          testID={MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW}
        >
          <Icon
            name={IconName.Arrow2Down}
            size={IconSize.Lg}
            color={IconColor.Muted}
          />
          <View style={styles.disabledRowContent}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
            >
              {strings('money.add_money_sheet.receive_external')}
            </Text>
            <Tag
              label={strings('money.add_money_sheet.coming_soon')}
              style={styles.comingSoonTag}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default MoneyAddMoneySheet;
