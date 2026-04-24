import React, { useCallback, useEffect } from 'react';
import { Pressable } from 'react-native';
import { Box, Skeleton } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { handleDeeplink } from '../../../core/DeeplinkManager/handlers/legacy/handleDeeplink';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import {
  logBrazeBannerImpression,
  logBrazeBannerClick,
} from '../../../core/Braze';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import { useBrazeBanner } from './useBrazeBanner';
import { isAllowedBrazeDeeplink } from './isAllowedBrazeDeeplink';
import BrazeBannerCard from './BrazeBannerCard';
import { BANNER_HEIGHT } from './BrazeBanner.constants';

interface BrazeBannerProps {
  placementId: string;
}

/**
 * Orchestrates the Braze banner lifecycle for a given placement ID.
 *
 * Subscribes to `bannerCardsUpdated`, manages loading/visible/empty/dismissed
 * state via `useBrazeBanner`, logs impressions and clicks, and delegates all
 * visual rendering to `BrazeBannerCard` (swap out for another renderer if needed).
 *
 * State machine (managed by `useBrazeBanner`):
 * - `loading`   → skeleton visible, waits for a non-dismissed banner
 * - `visible`   → BrazeBannerCard rendered
 * - `empty`     → returns null (no campaign / timeout reached)
 * - `dismissed` → returns null immediately, no skeleton shown again
 */
const BrazeBanner = ({ placementId }: BrazeBannerProps) => {
  const tw = useTailwind();
  const {
    status,
    bannerId,
    title,
    body,
    imageUrl,
    ctaLabel,
    deeplink,
    dismiss,
  } = useBrazeBanner(placementId);

  useEffect(() => {
    if (status === 'visible') {
      logBrazeBannerImpression(placementId, bannerId);
    }
  }, [status, placementId, bannerId]);

  const handlePress = useCallback(() => {
    if (!deeplink) return;
    if (!isAllowedBrazeDeeplink(deeplink)) {
      Logger.error(new Error('BrazeBanner: deeplink rejected by allowlist'), {
        placementId,
        deeplink,
      });
      return;
    }
    logBrazeBannerClick(placementId);
    handleDeeplink({
      uri: deeplink,
      source: AppConstants.DEEPLINKS.ORIGIN_BRAZE,
    });
  }, [deeplink, placementId]);

  if (status === 'empty' || status === 'dismissed') return null;

  return (
    <Box testID={BRAZE_BANNER_TEST_IDS.CONTAINER} style={tw.style('mx-4')}>
      {status === 'loading' && (
        <Skeleton
          height={BANNER_HEIGHT}
          twClassName="rounded-xl"
          testID={BRAZE_BANNER_TEST_IDS.SKELETON}
        />
      )}

      {status === 'visible' && body && (
        <Pressable
          testID={BRAZE_BANNER_TEST_IDS.PRESSABLE}
          onPress={handlePress}
        >
          <BrazeBannerCard
            title={title}
            body={body}
            imageUrl={imageUrl}
            ctaLabel={ctaLabel}
            onDismiss={dismiss}
          />
        </Pressable>
      )}
    </Box>
  );
};

export default BrazeBanner;
