import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useParams } from '../../../../../util/navigation/navUtils';
import styleSheet from './MoneyEarningsInfoSheet.styles';
import { MoneyEarningsInfoSheetTestIds } from './MoneyEarningsInfoSheet.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

export type MoneyEarningsInfoSheetVariant = 'monthly' | 'lifetime';

interface MoneyEarningsInfoSheetParams {
  variant: MoneyEarningsInfoSheetVariant;
}

const VARIANT_CONFIG = {
  monthly: {
    titleKey: 'money.earnings_tooltip.monthly.title',
    bodyKey: 'money.earnings_tooltip.monthly.body',
    bottomSheetName: BOTTOM_SHEET_NAMES.MONEY_MONTHLY_EARNINGS_INFO_SHEET,
  },
  lifetime: {
    titleKey: 'money.earnings_tooltip.lifetime.title',
    bodyKey: 'money.earnings_tooltip.lifetime.body',
    bottomSheetName: BOTTOM_SHEET_NAMES.MONEY_LIFETIME_EARNINGS_INFO_SHEET,
  },
} as const;

const MoneyEarningsInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { variant } = useParams<MoneyEarningsInfoSheetParams>();
  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.monthly;

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: config.bottomSheetName,
  });

  useMountEffect(trackBottomSheetViewed);

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
      testID={MoneyEarningsInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>{strings(config.titleKey)}</Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd}>{strings(config.bodyKey)}</Text>
      </View>
    </BottomSheet>
  );
};

export default MoneyEarningsInfoSheet;
