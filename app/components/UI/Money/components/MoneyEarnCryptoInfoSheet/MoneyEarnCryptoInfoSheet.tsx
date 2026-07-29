import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useParams } from '../../../../../util/navigation/navUtils';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import styleSheet from './MoneyEarnCryptoInfoSheet.styles';
import { MoneyEarnCryptoInfoSheetTestIds } from './MoneyEarnCryptoInfoSheet.testIds';

import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useMoneyNavigation } from '../../hooks/useMoneyNavigation';

type MoneyEarnCryptoInfoSheetVariant = 'default' | 'deposit';

interface MoneyEarnCryptoInfoSheetParams {
  showMoneyHomeCta?: boolean;
  variant?: MoneyEarnCryptoInfoSheetVariant;
}

const MoneyEarnCryptoInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { showMoneyHomeCta = false, variant = 'default' } =
    useParams<MoneyEarnCryptoInfoSheetParams>();
  const { apyPercent } = useMoneyAccountBalance();
  const { isOnboardingRedirectNeeded, navigateToMoneyHome } =
    useMoneyNavigation();

  const { trackBottomSheetViewed, trackButtonClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_EARN_CRYPTO_INFO_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGoToMoneyHome = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: isOnboardingRedirectNeeded
        ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING
        : MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
      label_key: 'money.earn_crypto_info_sheet.go_to_money_account',
      redirect_target: isOnboardingRedirectNeeded
        ? SCREEN_NAMES.MONEY_ONBOARDING
        : SCREEN_NAMES.MONEY_HOME,
    });
    navigateToMoneyHome();
  }, [isOnboardingRedirectNeeded, navigateToMoneyHome, trackButtonClicked]);

  const title =
    variant === 'deposit'
      ? strings('money.earn_crypto_info_sheet.deposit_title')
      : strings('money.earn_crypto_info_sheet.title');

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyEarnCryptoInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          testID={MoneyEarnCryptoInfoSheetTestIds.TITLE}
        >
          {title}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text
          variant={TextVariant.BodyMd}
          testID={MoneyEarnCryptoInfoSheetTestIds.BODY}
        >
          {strings('money.earn_crypto_info_sheet.body', {
            percentage: apyPercent ?? '-',
          })}
        </Text>
        {showMoneyHomeCta && (
          <Button
            isFullWidth
            onPress={handleGoToMoneyHome}
            size={ButtonSize.Lg}
            testID={MoneyEarnCryptoInfoSheetTestIds.MONEY_HOME_BUTTON}
            variant={ButtonVariant.Primary}
          >
            {strings('money.earn_crypto_info_sheet.go_to_money_account')}
          </Button>
        )}
      </View>
    </BottomSheet>
  );
};

export default MoneyEarnCryptoInfoSheet;
