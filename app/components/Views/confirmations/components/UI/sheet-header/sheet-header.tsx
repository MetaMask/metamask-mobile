import React from 'react';
import { useSelector } from 'react-redux';

import BottomSheetHeaderGlass, {
  type BottomSheetHeaderGlassProps,
} from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

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
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  return <BottomSheetHeaderGlass {...props} isGlass={isGlassHeader} />;
};
