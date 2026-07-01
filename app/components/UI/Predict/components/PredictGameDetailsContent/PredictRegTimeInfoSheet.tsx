import React, { forwardRef } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../../locales/i18n';

interface PredictRegTimeInfoSheetProps {
  onClose?: () => void;
}

const PredictRegTimeInfoSheet = forwardRef<
  BottomSheetRef,
  PredictRegTimeInfoSheetProps
>(({ onClose }, ref) => (
  <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
    <SheetHeader title={strings('predict.reg_time_info.title')} />
    <Box twClassName="px-4 pb-4">
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        {strings('predict.reg_time_info.description')}
      </Text>
    </Box>
  </BottomSheet>
));

PredictRegTimeInfoSheet.displayName = 'PredictRegTimeInfoSheet';

export default PredictRegTimeInfoSheet;
