import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import styleSheet from './MoneyEarnCryptoInfoSheet.styles';
import { MoneyEarnCryptoInfoSheetTestIds } from './MoneyEarnCryptoInfoSheet.testIds';

const FALLBACK_APY = 4;

const MoneyEarnCryptoInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { apyPercent } = useMoneyAccountBalance();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

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
          {strings('money.earn_crypto_info_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text
          variant={TextVariant.BodyMd}
          testID={MoneyEarnCryptoInfoSheetTestIds.BODY}
        >
          {strings('money.earn_crypto_info_sheet.body', {
            percentage: apyPercent ?? FALLBACK_APY,
          })}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default MoneyEarnCryptoInfoSheet;
