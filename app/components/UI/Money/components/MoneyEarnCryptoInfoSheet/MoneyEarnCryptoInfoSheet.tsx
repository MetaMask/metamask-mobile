import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
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
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

type MoneyEarnCryptoInfoSheetVariant = 'default' | 'deposit';

interface MoneyEarnCryptoInfoSheetParams {
  variant?: MoneyEarnCryptoInfoSheetVariant;
}

const MoneyEarnCryptoInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { variant = 'default' } = useParams<MoneyEarnCryptoInfoSheetParams>();
  const { apyPercent } = useMoneyAccountBalance();

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_EARN_CRYPTO_INFO_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

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
      </View>
    </BottomSheet>
  );
};

export default MoneyEarnCryptoInfoSheet;
