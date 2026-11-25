import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { RecurringRepeatInfoSheetSelectorsIDs } from './RecurringRepeatInfoSheet.testIds';
import type { RecurringRepeatInfoSheetProps } from './RecurringRepeatInfoSheet.types';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const RecurringRepeatInfoSheet = ({
  goBack,
}: RecurringRepeatInfoSheetProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringRepeatInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.repeat_info_title')}
      </BottomSheetHeaderGlass>
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
