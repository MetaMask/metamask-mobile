import React, { useEffect, useState } from 'react';
import Braze from '@braze/react-native-sdk';
import { Box } from '@metamask/design-system-react-native';
import { BRAZE_BANNER_PLACEMENT_ID } from '../../../core/Braze/constants';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import Logger from '../../../util/Logger';

const BANNER_HEIGHT = 120;

/**
 * Renders the Braze Banner for the configured placement.
 *
 * Reads the cached banner via `Braze.getBanner` and re-reads whenever
 * `bannerCardsUpdated` fires. The view is only mounted when a banner exists,
 * preventing any empty-space flash when there is no active campaign.
 */
const BrazeBanner = () => {
  const [hasBanner, setHasBanner] = useState(false);

  useEffect(() => {
    const syncBannerVisibility = async () => {
      try {
        // Reads from the local Braze SDK cache, not the network
        const banner = await Braze.getBanner(BRAZE_BANNER_PLACEMENT_ID);
        Logger.log('[BrazeBanner] banner', banner);
        setHasBanner(banner !== null && banner !== undefined);
      } catch (error) {
        Logger.error(error as Error, '[BrazeBanner] Failed to read banner');
        setHasBanner(false);
      }
    };

    syncBannerVisibility();

    const subscription = Braze.addListener(
      Braze.Events.BANNER_CARDS_UPDATED,
      syncBannerVisibility,
    );

    return () => subscription.remove();
  }, []);

  if (!hasBanner) {
    return null;
  }

  return (
    <Box
      testID={BRAZE_BANNER_TEST_IDS.CONTAINER}
      twClassName="mx-4"
      style={{ height: BANNER_HEIGHT }}
    >
      <Braze.BrazeBannerView
        data-testid={BRAZE_BANNER_TEST_IDS.BANNER_VIEW}
        placementID={BRAZE_BANNER_PLACEMENT_ID}
        style={{ height: BANNER_HEIGHT }}
      />
    </Box>
  );
};

export default BrazeBanner;
