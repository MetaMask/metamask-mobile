import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import PayWithSection from '../../UI/pay-with-section';
import { useDismissOnPaymentChange } from '../../../hooks/pay/useDismissOnPaymentChange';
import { usePayWithSections } from '../../../hooks/pay/usePayWithSections';
import { isTransactionPayWithdraw } from '../../../utils/transaction';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';

export const PAY_WITH_BOTTOM_SHEET_TEST_ID = 'pay-with-bottom-sheet';

export function PayWithBottomSheet() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { sections } = usePayWithSections();
  const transactionMeta = useTransactionMetadataRequest();
  const surfaceClass = useElevatedSurface();
  useDismissOnPaymentChange({ dismissOnPayTokenChange: false });
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const title = isWithdraw
    ? strings('confirm.pay_with_bottom_sheet.receive_title')
    : strings('confirm.pay_with_bottom_sheet.title');

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
      testID={PAY_WITH_BOTTOM_SHEET_TEST_ID}
      keyboardAvoidingViewEnabled={false}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
      </BottomSheetHeader>
      <ScrollView testID={`${PAY_WITH_BOTTOM_SHEET_TEST_ID}-scroll`}>
        {sections.map((section) => (
          <PayWithSection key={section.id} config={section} />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

export default PayWithBottomSheet;
