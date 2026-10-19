import React from 'react';
import { usePerpsScreenVsBottomSheetAbTest } from '../../hooks';
import PerpsClosePositionBottomSheet from '../PerpsClosePositionBottomSheet';
import PerpsClosePositionView from '../PerpsClosePositionView';

/**
 * Route component registered for `Routes.PERPS.CLOSE_POSITION`.
 *
 * Mounting here is what counts as exposure — the navigator reads the same
 * assignment with `trackExposure: false` purely to pick screen options.
 */
const PerpsClosePositionRouter: React.FC = () => {
  const { useBottomSheet } = usePerpsScreenVsBottomSheetAbTest();

  return useBottomSheet ? (
    <PerpsClosePositionBottomSheet />
  ) : (
    <PerpsClosePositionView />
  );
};

export default PerpsClosePositionRouter;
