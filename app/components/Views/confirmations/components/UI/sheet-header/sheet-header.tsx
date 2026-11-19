import React from 'react';

import BottomSheetHeaderGlass, {
  type BottomSheetHeaderGlassProps,
} from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useIsGlassHeader } from '../../../../../hooks/useIsGlassHeader';

export type ConfirmationSheetHeaderProps = Omit<
  BottomSheetHeaderGlassProps,
  'isGlass'
>;

/**
 * Sheet header with glass buttons behind `glassHeaders`. Reads the flag
 * itself, so a closed tooltip never touches the store.
 */
export const ConfirmationSheetHeader = (
  props: ConfirmationSheetHeaderProps,
) => {
  const isGlassHeader = useIsGlassHeader();
  return <BottomSheetHeaderGlass {...props} isGlass={isGlassHeader} />;
};
