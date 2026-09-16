import React, { useCallback, useRef } from 'react';
import {
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import RecurringBottomSheet from '../RecurringBottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { RecurringRepeatInfoSheetSelectorsIDs } from './RecurringRepeatInfoSheet.testIds';
import type { RecurringRepeatInfoSheetProps } from './RecurringRepeatInfoSheet.types';

const RecurringRepeatInfoSheet = ({
  isVisible,
  onClose,
}: RecurringRepeatInfoSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <RecurringBottomSheet
      ref={sheetRef}
      testID={RecurringRepeatInfoSheetSelectorsIDs.SHEET}
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringRepeatInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.repeat_info_title')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={RecurringRepeatInfoSheetSelectorsIDs.BODY}
        >
          {strings('bridge.recurring.repeat_info_body')}
        </Text>
      </Box>
    </RecurringBottomSheet>
  );
};

export default RecurringRepeatInfoSheet;
