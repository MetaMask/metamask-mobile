import { useSelector } from 'react-redux';
import { selectCarouselBannersFlag } from '../../../UI/Carousel/selectors/featureFlags';
import { selectBrazeBannerHomeFlag } from '../../../../selectors/featureFlagController/brazeBannerHome';

export type HomeGrowthBannerType = 'braze' | 'carousel' | null;

/**
 * Resolves which growth team home banner variant to display.
 * Braze takes priority over the carousel when both flags are enabled.
 */
export const useHomeGrowthBanner = (): HomeGrowthBannerType => {
  const isBrazeBannerHomeEnabled = useSelector(selectBrazeBannerHomeFlag);
  const isCarouselBannersEnabled = useSelector(selectCarouselBannersFlag);

  if (isBrazeBannerHomeEnabled) return 'braze';
  if (isCarouselBannersEnabled) return 'carousel';
  return null;
};
