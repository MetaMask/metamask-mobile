import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictOrderPreview } from '../../../types';

import { OrderDetailsRows } from './OrderDetailsRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

interface OrderBreakdownSheetProps {
  preview: PredictOrderPreview;
  onClose: () => void;
}

/**
 * The price details sheet opened from the "To win" line of a buy or the
 * "Net proceeds" line of a Cash Out, stacked above the Order sheet. Matches
 * the Legacy "Price details" sheet layout with a header and close button,
 * and renders backend-owned values verbatim via OrderDetailsRows.
 */
export const OrderBreakdownSheet = forwardRef<
  React.ComponentRef<typeof BottomSheet>,
  OrderBreakdownSheetProps
>(({ preview, onClose }, ref) => {
  const sheetRef = useRef<React.ComponentRef<typeof BottomSheet>>(null);

  useImperativeHandle(
    ref,
    () => ({
      onOpenBottomSheet: (callback) => {
        sheetRef.current?.onOpenBottomSheet(callback);
      },
      onCloseBottomSheet: (callback) => {
        sheetRef.current?.onCloseBottomSheet(callback);
      },
    }),
    [],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      onClose={onClose}
      testID={PredictOrderFlowTestIds.BREAKDOWN}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('predict_next.order_preview.close'),
          testID: PredictOrderFlowTestIds.BREAKDOWN_CLOSE,
        }}
        textProps={{ testID: PredictOrderFlowTestIds.BREAKDOWN_HEADER }}
        // The built-in header height clips the title against the sheet's
        // top radius. Release it and keep a taller minimum instead.
        twClassName="h-auto min-h-16"
        testID={PredictOrderFlowTestIds.BREAKDOWN_HEADER_BAR}
      >
        {strings('predict.fee_summary.price_details')}
      </BottomSheetHeader>
      <Box twClassName="px-4 pb-6">
        <OrderDetailsRows preview={preview} />
      </Box>
    </BottomSheet>
  );
});

OrderBreakdownSheet.displayName = 'OrderBreakdownSheet';
