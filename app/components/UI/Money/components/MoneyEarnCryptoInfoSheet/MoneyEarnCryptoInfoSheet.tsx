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
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useParams } from '../../../../../util/navigation/navUtils';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import styleSheet from './MoneyEarnCryptoInfoSheet.styles';
import { MoneyEarnCryptoInfoSheetTestIds } from './MoneyEarnCryptoInfoSheet.testIds';

import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';
import { useMoneyHomeNavigation } from '../../hooks/useMoneyHomeNavigation';

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
  const { apyPercent } = useMoneyVaultApy();
  const { navigateToMoneyHome } = useMoneyHomeNavigation();

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
    navigateToMoneyHome({
      track: ({ button_intent, redirect_target }) => {
        trackButtonClicked({
          button_type: MONEY_BUTTON_TYPES.TEXT,
          button_intent,
          label_key: 'money.earn_crypto_info_sheet.go_to_money_account',
          redirect_target,
        });
      },
    });
  }, [navigateToMoneyHome, trackButtonClicked]);

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
          color={TextColor.TextAlternative}
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
            variant={ButtonVariant.Secondary}
            twClassName="mt-4"
          >
            {strings('money.earn_crypto_info_sheet.go_to_money_account')}
          </Button>
        )}
      </View>
    </BottomSheet>
  );
};

export default MoneyEarnCryptoInfoSheet;
