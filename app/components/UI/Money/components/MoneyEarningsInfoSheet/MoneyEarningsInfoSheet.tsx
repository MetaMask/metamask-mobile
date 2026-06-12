import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './MoneyEarningsInfoSheet.styles';
import { MoneyEarningsInfoSheetTestIds } from './MoneyEarningsInfoSheet.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

const MoneyEarningsInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const surfaceClass = useElevatedSurface();

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
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.earnings_tooltip.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.earnings_tooltip.body')}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default MoneyEarningsInfoSheet;
