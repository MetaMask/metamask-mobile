import { useSelector } from 'react-redux';
import { selectCarouselBannersFlag } from '../../../UI/Carousel/selectors/featureFlags';
import { selectBrazeBannerHomeFlag } from '../../../../selectors/featureFlagController/brazeBannerHome';
import { selectCanonicalProfileId } from '../../../../selectors/identity';

export type HomeGrowthBannerType = 'braze' | 'carousel' | null;

/**
 * Resolves which growth team home banner variant to display.
 * Braze takes priority over the carousel when both flags are enabled, but
 * only after a canonical profile ID exists so we never show the previous
 * wallet's cached campaign during reset/import.
 */
export const useHomeGrowthBanner = (): HomeGrowthBannerType => {
  const isBrazeBannerHomeEnabled = useSelector(selectBrazeBannerHomeFlag);
  const isCarouselBannersEnabled = useSelector(selectCarouselBannersFlag);
  const canonicalProfileId = useSelector(selectCanonicalProfileId);

  if (isBrazeBannerHomeEnabled) {
    return canonicalProfileId ? 'braze' : null;
  }
  if (isCarouselBannersEnabled) return 'carousel';
  return null;
};
