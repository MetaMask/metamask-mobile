import { useSelector } from 'react-redux';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { selectPerpsBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/perpsBrandRefresh';
import { PERPS_MARKET_HEADER_HEIGHT } from './PerpsMarketHeader.types';

/**
 * Insets for a market screen whose `PerpsMarketHeader` floats over the content.
 *
 * @param edgeInsets - Set when the screen runs under the status bar and home indicator.
 * @param isServiceBannerShown - Whether the service banner sits above the header.
 * @returns The header's status bar padding, and the content height it covers (0 when not floating).
 */
export const usePerpsMarketHeaderInsets = (
  edgeInsets: Pick<EdgeInsets, 'top' | 'bottom'> | undefined,
  isServiceBannerShown: boolean,
) => {
  const isBrandRefresh = useSelector(selectPerpsBrandRefreshEnabled) === true;
  // The service banner sits above the header, so it pads the status bar instead.
  const headerTopInset = isServiceBannerShown ? 0 : (edgeInsets?.top ?? 0);

  return {
    headerTopInset,
    headerInset: isBrandRefresh
      ? headerTopInset + PERPS_MARKET_HEADER_HEIGHT
      : 0,
  };
};
