import React, { useCallback, useRef } from 'react';
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
import { usePayWithSections } from '../../../hooks/pay/usePayWithSections';

export const PAY_WITH_BOTTOM_SHEET_TEST_ID = 'pay-with-bottom-sheet';

export function PayWithBottomSheet() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { sections } = usePayWithSections();

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
