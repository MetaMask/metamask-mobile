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
import styleSheet from './MoneyApyInfoSheet.styles';
import { MoneyApyInfoSheetTestIds } from './MoneyApyInfoSheet.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

type MoneyApyInfoSheetVariant = 'default' | 'deposit';

interface MoneyApyInfoSheetParams {
  apy?: number;
  variant?: MoneyApyInfoSheetVariant;
}

const MoneyApyInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const { apy, variant = 'default' } = useParams<MoneyApyInfoSheetParams>();

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_APY_INFO_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const body =
    variant === 'deposit' ? (
      <Text variant={TextVariant.BodyMd}>
        {strings('money.apy_tooltip.deposit_body')}
      </Text>
    ) : (
      <>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.apy_tooltip.paragraph_1', { percentage: apy })}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.apy_tooltip.paragraph_2')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.apy_tooltip.paragraph_3')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.apy_tooltip.paragraph_4')}
        </Text>
      </>
    );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyApyInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.apy_tooltip.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>{body}</View>
    </BottomSheet>
  );
};

export default MoneyApyInfoSheet;
