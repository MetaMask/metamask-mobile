import { useSelector } from 'react-redux';
import { useLiquidGlass } from '../../component-library/hooks/useLiquidGlass';
import type { RootState } from '../../reducers';

/**
 * Whether a screen's brand refresh surfaces (CTA tiles, banners, cards) render
 * as Liquid Glass: its flag is on and the OS can draw glass.
 */
export const useIsGlassSurfaceEnabled = (
  selectFlag: (state: RootState) => boolean,
): boolean => {
  const isFlagEnabled = useSelector(selectFlag);
  const { isGlassEnabled } = useLiquidGlass();
  // Strict check: many suites stub `useSelector` with non-boolean values.
  return isFlagEnabled === true && isGlassEnabled;
};
