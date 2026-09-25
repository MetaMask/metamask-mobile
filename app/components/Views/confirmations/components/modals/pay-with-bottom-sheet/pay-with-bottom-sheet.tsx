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
import { PayWithBottomSheetIDs } from '../../../ConfirmationView.testIds';

export const PAY_WITH_BOTTOM_SHEET_TEST_ID = PayWithBottomSheetIDs.BOTTOM_SHEET;

interface PayWithScreenContentProps {
  onBack?: () => void;
  onClose?: () => void;
}

export function PayWithScreenContent({
  onBack,
  onClose,
}: PayWithScreenContentProps) {
  const { sections } = usePayWithSections();
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const title = isWithdraw
    ? strings('confirm.pay_with_bottom_sheet.receive_title')
    : strings('confirm.pay_with_bottom_sheet.title');

  return (
    <>
      <BottomSheetHeader onBack={onBack} onClose={onClose}>
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
      </BottomSheetHeader>
      <ScrollView testID={`${PAY_WITH_BOTTOM_SHEET_TEST_ID}-scroll`}>
        {sections.map((section) => (
          <PayWithSection key={section.id} config={section} />
        ))}
      </ScrollView>
    </>
  );
}

export function PayWithBottomSheet() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  useDismissOnPaymentChange({ dismissOnPayTokenChange: false });

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
    >
      <PayWithScreenContent onClose={handleClose} />
    </BottomSheet>
  );
}

export default PayWithBottomSheet;
