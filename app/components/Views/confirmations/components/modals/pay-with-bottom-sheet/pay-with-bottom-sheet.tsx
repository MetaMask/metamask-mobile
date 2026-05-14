import React, { type RefObject, useCallback, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import PayWithSection from '../../UI/pay-with-section';
import { useDismissOnFiatPaymentChange } from '../../../hooks/pay/useDismissOnFiatPaymentChange';
import { useDismissOnPayTokenChange } from '../../../hooks/pay/useDismissOnPayTokenChange';
import { usePayWithSections } from '../../../hooks/pay/usePayWithSections';

export const PAY_WITH_BOTTOM_SHEET_TEST_ID = 'pay-with-bottom-sheet';

export function PayWithBottomSheet() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { sections } = usePayWithSections();
  /**
   * Shared latch coordinating the two dismiss hooks. A single controller write
   * (e.g. `TransactionPayController.updatePaymentToken` clearing `fiatPayment`)
   * can flip both observed values in the same flush; without the shared latch
   * each hook would call `navigation.goBack()` independently and pop two
   * routes instead of one.
   */
  const sharedDismissedRef: RefObject<boolean> = useRef<boolean>(false);
  useDismissOnPayTokenChange(sharedDismissedRef);
  useDismissOnFiatPaymentChange(sharedDismissedRef);

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
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('confirm.pay_with_bottom_sheet.title')}
        </Text>
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
