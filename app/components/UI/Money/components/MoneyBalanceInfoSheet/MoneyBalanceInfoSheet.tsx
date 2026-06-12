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
import styleSheet from './MoneyBalanceInfoSheet.styles';
import { MoneyBalanceInfoSheetTestIds } from './MoneyBalanceInfoSheet.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

const MoneyBalanceInfoSheet = () => {
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
      testID={MoneyBalanceInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text
          variant={TextVariant.HeadingSm}
          testID={MoneyBalanceInfoSheetTestIds.TITLE}
        >
          {strings('money.balance_card.info_sheet_title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text
          variant={TextVariant.BodyMd}
          testID={MoneyBalanceInfoSheetTestIds.BODY}
        >
          {strings('money.balance_card.info_sheet_body')}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default MoneyBalanceInfoSheet;
