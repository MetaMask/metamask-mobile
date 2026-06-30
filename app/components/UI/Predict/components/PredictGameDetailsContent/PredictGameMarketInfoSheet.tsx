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

interface PredictGameMarketInfoSheetProps {
  title: string;
  description: string;
  onClose?: () => void;
}

const PredictGameMarketInfoSheet = forwardRef<
  BottomSheetRef,
  PredictGameMarketInfoSheetProps
>(({ title, description, onClose }, ref) => {
  const handleClose = () => {
    onClose?.();
  };

  return (
    <BottomSheet ref={ref} onClose={handleClose} shouldNavigateBack={false}>
      <SheetHeader title={title} />
      <Box twClassName="px-4 pb-4">
        <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
          {description}
        </Text>
      </Box>
    </BottomSheet>
  );
});

PredictGameMarketInfoSheet.displayName = 'PredictGameMarketInfoSheet';

export default PredictGameMarketInfoSheet;
