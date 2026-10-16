import { useSelector } from 'react-redux';
import { useLiquidGlass } from '../../../../component-library/hooks/useLiquidGlass';
import { selectTokenDetailsBrandRefreshEnabled } from '../../../../selectors/featureFlagController/tokenDetailsBrandRefresh';

/** Footer material: glass on iOS 26, blur on older iOS, original on Android. */
export const useTokenDetailsGlassFooter = () => {
  const isBrandRefresh =
    useSelector(selectTokenDetailsBrandRefreshEnabled) === true;
  const { isGlassEnabled, isBlurEnabled } = useLiquidGlass();
  const isGlass = isBrandRefresh && isGlassEnabled;
  const isBlur = isBrandRefresh && isBlurEnabled;

  return { isGlass, isBlur, isRefreshed: isGlass || isBlur };
};
