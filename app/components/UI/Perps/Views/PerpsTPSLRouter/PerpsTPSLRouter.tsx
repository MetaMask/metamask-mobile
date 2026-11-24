import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { PerpsNavigationParamList } from '../../types/navigation';
import PerpsTPSLView from '../PerpsTPSLView/PerpsTPSLView';

/**
 * Chooses the TP/SL presentation for `Routes.PERPS.TPSL`.
 *
 * The arm is resolved by the caller and arrives as `useBottomSheet`, matching
 * how the adjust-margin and modify entry points carry the same experiment. It
 * cannot be resolved here: the navigator needs it before this mounts, to drop
 * the stack animation that would otherwise slide the sheet's backdrop in.
 *
 * The Lite order-placement callers omit it: they reach this same route while
 * the trade flow is itself a bottom sheet under treatment, so converting them
 * would stack a sheet on a sheet. They never read the experiment, which also
 * keeps them out of its exposure count. Pro's order form is an inline panel
 * rather than a sheet, so it has no such conflict and does pass the param.
 */
const PerpsTPSLRouter: React.FC = () => {
  const route = useRoute<RouteProp<PerpsNavigationParamList, 'PerpsTPSL'>>();

  return (
    <PerpsTPSLView
      variant={route.params?.useBottomSheet ? 'sheet' : 'screen'}
    />
  );
};

export default PerpsTPSLRouter;
