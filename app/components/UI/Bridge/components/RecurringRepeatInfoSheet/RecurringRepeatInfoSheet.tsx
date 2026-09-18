import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { RecurringRepeatInfoSheetSelectorsIDs } from './RecurringRepeatInfoSheet.testIds';
import type { RecurringRepeatInfoSheetProps } from './RecurringRepeatInfoSheet.types';

const RecurringRepeatInfoSheet = ({
  goBack,
}: RecurringRepeatInfoSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={RecurringRepeatInfoSheetSelectorsIDs.SHEET}
      goBack={goBack}
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
    </BottomSheet>
  );
};

export default RecurringRepeatInfoSheet;
