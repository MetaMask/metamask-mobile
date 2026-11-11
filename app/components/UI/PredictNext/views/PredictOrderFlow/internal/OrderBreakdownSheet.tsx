import React, { forwardRef } from 'react';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  Box,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictOrderPreview } from '../../../types';

import { OrderPreviewRows } from './OrderPreviewRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import BottomSheetHeaderGlass from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';

interface OrderBreakdownSheetProps {
  preview: PredictOrderPreview;
  onClose: () => void;
}

/**
 * The Total row's 'i' details: the full quoted Preview rows stacked above
 * the Order sheet. All values are backend-owned and rendered verbatim by
 * OrderPreviewRows.
 */
export const OrderBreakdownSheet = forwardRef<
  React.ComponentRef<typeof BottomSheet>,
  OrderBreakdownSheetProps
>(({ preview, onClose }, ref) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;

  return (
    <BottomSheet
      ref={ref}
      onClose={onClose}
      testID={PredictOrderFlowTestIds.BREAKDOWN}
    >
      <BottomSheetHeaderGlass isGlass={isGlassHeader} onClose={onClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('predict_next.order_preview.price_details')}
        </Text>
      </BottomSheetHeaderGlass>
      <Box twClassName="px-4 pb-6 pt-2">
        <OrderPreviewRows preview={preview} />
      </Box>
    </BottomSheet>
  );
});

OrderBreakdownSheet.displayName = 'OrderBreakdownSheet';
