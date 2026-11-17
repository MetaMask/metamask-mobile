import React, { forwardRef } from 'react';
import { BottomSheet, Box } from '@metamask/design-system-react-native';
import type { PredictBuyOrderPreview } from '../../../types';

import { OrderDetailsRows } from './OrderDetailsRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

interface OrderBreakdownSheetProps {
  preview: PredictBuyOrderPreview;
  onClose: () => void;
}

/**
 * The buy details sheet opened from the "To win" line, stacked above the
 * Order sheet. It has no title and no close button: only the drag handle,
 * and it dismisses by drag or backdrop tap. All values are backend-owned and
 * rendered verbatim by OrderDetailsRows.
 */
export const OrderBreakdownSheet = forwardRef<
  React.ComponentRef<typeof BottomSheet>,
  OrderBreakdownSheetProps
>(({ preview, onClose }, ref) => (
  <BottomSheet
    ref={ref}
    onClose={onClose}
    testID={PredictOrderFlowTestIds.BREAKDOWN}
  >
    <Box twClassName="px-4 pb-6">
      <OrderDetailsRows preview={preview} />
    </Box>
  </BottomSheet>
));

OrderBreakdownSheet.displayName = 'OrderBreakdownSheet';
