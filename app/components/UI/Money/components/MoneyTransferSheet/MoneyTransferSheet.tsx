import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  IconName,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyPerpsDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPerpsDeposit';
import { useMoneyPredictDeposit } from '../../../../Views/confirmations/hooks/pay/useMoneyPredictDeposit';
import Logger from '../../../../../util/Logger';
import MoneySheetOptionsList, {
  type MoneySheetOption,
} from '../MoneySheetOptionsList';
import styleSheet from './MoneyTransferSheet.styles';
import { MoneyTransferSheetTestIds } from './MoneyTransferSheet.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';

const MoneyTransferSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();
  const surfaceClass = useElevatedSurface();
  const { isEnabled: isPerpsEnabled, initiatePerpsDeposit } =
    useMoneyPerpsDeposit();
  const { isEnabled: isPredictEnabled, initiatePredictDeposit } =
    useMoneyPredictDeposit();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBetweenAccounts = useCallback(() => {
    trackSurfaceClicked({
      component_name:
        COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_BETWEEN_ACCOUNTS,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    sheetRef.current?.onCloseBottomSheet(() => {
      initiateWithdrawal().catch((error: Error) => {
        Logger.error(
          error,
          '[MoneyTransferSheet] Withdrawal initiation failed',
        );
      });
    });
  }, [initiateWithdrawal, trackSurfaceClicked]);

  const handlePerpsAccount = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_PERPS_ACCOUNT,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    sheetRef.current?.onCloseBottomSheet(() => {
      initiatePerpsDeposit();
    });
  }, [initiatePerpsDeposit, trackSurfaceClicked]);

  const handlePredictionsAccount = useCallback(() => {
    trackSurfaceClicked({
      component_name:
        COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_PREDICTIONS_ACCOUNT,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    sheetRef.current?.onCloseBottomSheet(() => {
      initiatePredictDeposit();
    });
  }, [initiatePredictDeposit, trackSurfaceClicked]);

  const options: MoneySheetOption[] = [
    {
      label: strings('money.transfer_sheet.between_accounts'),
      icon: IconName.Arrow2UpRight,
      onPress: handleBetweenAccounts,
      testID: MoneyTransferSheetTestIds.BETWEEN_ACCOUNTS_OPTION,
    },
    {
      label: strings('money.transfer_sheet.perps_account'),
      icon: IconName.Candlestick,
      onPress: handlePerpsAccount,
      testID: MoneyTransferSheetTestIds.PERPS_ACCOUNT_OPTION,
      disabled: !isPerpsEnabled,
    },
    {
      label: strings('money.transfer_sheet.predictions_account'),
      icon: IconName.Speedometer,
      onPress: handlePredictionsAccount,
      testID: MoneyTransferSheetTestIds.PREDICTIONS_ACCOUNT_OPTION,
      disabled: !isPredictEnabled,
    },
    {
      label: strings('money.transfer_sheet.send_external'),
      icon: IconName.Arrow2Up,
      testID: MoneyTransferSheetTestIds.SEND_EXTERNAL_ROW,
      disabled: true,
      comingSoon: true,
    },
    {
      label: strings('money.transfer_sheet.withdraw_to_bank'),
      icon: IconName.Bank,
      testID: MoneyTransferSheetTestIds.WITHDRAW_TO_BANK_ROW,
      disabled: true,
      comingSoon: true,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyTransferSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.transfer_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.list}>
        <MoneySheetOptionsList options={options} />
      </View>
    </BottomSheet>
  );
};

export default MoneyTransferSheet;
