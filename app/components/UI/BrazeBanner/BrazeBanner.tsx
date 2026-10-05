import React, { useCallback, useEffect } from 'react';
import { Linking, Pressable } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import {
  logBrazeBannerImpression,
  logBrazeBannerClick,
} from '../../../core/Braze';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import { useBrazeBanner } from './useBrazeBanner';
import {
  isAllowedBrazeDeeplink,
  isAllowedBrazeExternalUrl,
} from './isAllowedBrazeDeeplink';
import BrazeBannerCard from './BrazeBannerCard';

interface BrazeBannerProps {
  placementId: string;
}

/**
 * Orchestrates the Braze banner lifecycle for a given placement ID.
 *
 * Subscribes to `bannerCardsUpdated`, manages loading/visible/empty/dismissed
 * state via `useBrazeBanner`, logs impressions and clicks, and delegates all
 * visual rendering to `BrazeBannerCard` (swap out for another renderer if needed).
 * MetaMask deeplinks use the shared deeplink pipeline; external web links open
 * with the OS browser.
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
    eventProperties,
    title,
    body,
    imageUrl,
    ctaLabel,
    deeplink,
    dismiss,
  } = useBrazeBanner(placementId);

  useEffect(() => {
    if (status === 'visible') {
      logBrazeBannerImpression(placementId, eventProperties);
    }
  }, [status, placementId, eventProperties]);

  const handlePress = useCallback(() => {
    if (!deeplink) return;
    const isInternalDeeplink = isAllowedBrazeDeeplink(deeplink);
    const isExternalUrl = isAllowedBrazeExternalUrl(deeplink);

    if (!isInternalDeeplink && !isExternalUrl) {
      Logger.error(new Error('BrazeBanner: deeplink rejected by allowlist'), {
        placementId,
        deeplink,
      });
      return;
    }
    logBrazeBannerClick(placementId);

    if (isExternalUrl) {
      Linking.openURL(deeplink).catch((error) => {
        Logger.error(error, 'BrazeBanner: failed to open external URL');
      });
      return;
    }

    SharedDeeplinkManager.getInstance()
      .parse(deeplink, {
        origin: AppConstants.DEEPLINKS.ORIGIN_BRAZE,
      })
      .catch((error) => {
        Logger.error(error, 'BrazeBanner: failed to handle deeplink');
      });
  }, [deeplink, placementId]);

  if (status === 'empty' || status === 'dismissed' || status === 'loading')
    return null;

  return status === 'visible' && body ? (
    <Box testID={BRAZE_BANNER_TEST_IDS.CONTAINER} style={tw.style('mx-4')}>
      <Pressable testID={BRAZE_BANNER_TEST_IDS.PRESSABLE} onPress={handlePress}>
        <BrazeBannerCard
          title={title}
          body={body}
          imageUrl={imageUrl}
          ctaLabel={ctaLabel}
          onDismiss={dismiss}
        />
      </Pressable>
    </Box>
  ) : null;
};

export default BrazeBanner;
