import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { PerpsNavigationParamList } from '../../types/navigation';
import { usePerpsScreenVsBottomSheetAbTest } from '../../hooks/usePerpsScreenVsBottomSheetAbTest';
import PerpsTPSLView from '../PerpsTPSLView/PerpsTPSLView';

/**
 * Reading the experiment records exposure, so it is isolated in its own
 * component and only mounted for the converted entry points. Otherwise the
 * order flow — which keeps the full screen either way — would be counted as
 * exposed without ever being treated.
 */
const PerpsTPSLPositionRouter: React.FC = () => {
  const { useBottomSheet } = usePerpsScreenVsBottomSheetAbTest();

  return <PerpsTPSLView variant={useBottomSheet ? 'sheet' : 'screen'} />;
};

/**
 * Chooses the TP/SL presentation for `Routes.PERPS.TPSL`.
 *
 * TAT-3747 converts the position-edit entry points only (market details and
 * the Pro positions panel). The order-placement entry points reach the same
 * route while the trade flow is itself a bottom sheet under treatment, so
 * converting them would stack a sheet on a sheet — they stay full screen.
 * Those two callers are distinguishable because only a position edit passes a
 * `position` param.
 */
const PerpsTPSLRouter: React.FC = () => {
  const route = useRoute<RouteProp<PerpsNavigationParamList, 'PerpsTPSL'>>();

  if (!route.params?.position) {
    return <PerpsTPSLView />;
  }

  return <PerpsTPSLPositionRouter />;
};

export default PerpsTPSLRouter;
