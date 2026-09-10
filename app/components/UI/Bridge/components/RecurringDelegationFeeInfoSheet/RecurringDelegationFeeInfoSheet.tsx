import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { RecurringDelegationFeeInfoSheetSelectorsIDs } from './RecurringDelegationFeeInfoSheet.testIds';
import type { RecurringDelegationFeeInfoSheetProps } from './RecurringDelegationFeeInfoSheet.types';

const RecurringDelegationFeeInfoSheet = ({
  goBack,
}: RecurringDelegationFeeInfoSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={RecurringDelegationFeeInfoSheetSelectorsIDs.SHEET}
      goBack={goBack}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringDelegationFeeInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.delegation_fee_info_title')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={RecurringDelegationFeeInfoSheetSelectorsIDs.BODY}
        >
          {strings('bridge.recurring.delegation_fee_info_body')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.recurring.got_it'),
          onPress: closeSheet,
          testID: RecurringDelegationFeeInfoSheetSelectorsIDs.GOT_IT_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default RecurringDelegationFeeInfoSheet;
