import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  BottomSheet,
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
import BottomSheetHeaderGlass from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

export const PAY_WITH_BOTTOM_SHEET_TEST_ID = PayWithBottomSheetIDs.BOTTOM_SHEET;

export function PayWithBottomSheet() {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { sections } = usePayWithSections();
  const transactionMeta = useTransactionMetadataRequest();
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
    >
      <BottomSheetHeaderGlass isGlass={isGlassHeader} onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
      </BottomSheetHeaderGlass>
      <ScrollView testID={`${PAY_WITH_BOTTOM_SHEET_TEST_ID}-scroll`}>
        {sections.map((section) => (
          <PayWithSection key={section.id} config={section} />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

export default PayWithBottomSheet;
