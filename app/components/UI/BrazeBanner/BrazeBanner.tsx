import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  Box,
  Icon,
  IconSize,
  IconName,
  IconColor as MMDSIconColor,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Braze from '@braze/react-native-sdk';
import { handleDeeplink } from '../../../core/DeeplinkManager/handlers/legacy/handleDeeplink';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import { useBrazeBanner } from './useBrazeBanner';
import BrazeBannerWebView from './BrazeBannerWebView';
import { isAllowedBrazeDeeplink } from './isAllowedBrazeDeeplink';

const DEFAULT_BANNER_HEIGHT = 120;
const MIN_BANNER_HEIGHT = 60;
const MAX_BANNER_HEIGHT = 240;

interface BrazeBannerProps {
  placementId: string;
}

/**
 * Renders a Braze Banner for the given placement ID.
 *
 * Replaces `Braze.BrazeBannerView` with a JS-driven render path that
 * subscribes to `bannerCardsUpdated`, filters out dismissed banners, and
 * renders `Banner.html` in a non-interactive `WebView`.
 *
 * State machine (managed by `useBrazeBanner`):
 *  - `loading`   → skeleton visible, waits for a non-dismissed banner
 *  - `visible`   → WebView rendered with actual banner content
 *  - `empty`     → returns null (no campaign / timeout reached)
 *  - `dismissed` → returns null immediately, no skeleton shown again
 */
const BrazeBanner = ({ placementId }: BrazeBannerProps) => {
  const tw = useTailwind();
  const { status, banner, deeplink, height, dismiss } =
    useBrazeBanner(placementId);

  useEffect(() => {
    if (status === 'visible' && banner) {
      Braze.logBannerImpression(banner.placementId);
    }
  }, [status, banner]);

  const handlePress = useCallback(() => {
    if (!banner || !deeplink) return;
    if (!isAllowedBrazeDeeplink(deeplink)) {
      Logger.error(
        new Error('BrazeBanner: deeplink rejected by allowlist'),
        { placementId, deeplink },
      );
      return;
    }
    Braze.logBannerClick(banner.placementId, null);
    handleDeeplink({
      uri: deeplink,
      source: AppConstants.DEEPLINKS.ORIGIN_BRAZE,
    });
  }, [banner, deeplink, placementId]);

  if (status === 'empty' || status === 'dismissed') return null;

  const containerHeight = Math.min(
    Math.max(height ?? DEFAULT_BANNER_HEIGHT, MIN_BANNER_HEIGHT),
    MAX_BANNER_HEIGHT,
  );

  return (
    <Box
      testID={BRAZE_BANNER_TEST_IDS.CONTAINER}
      style={[tw.style('mx-4 relative'), { height: containerHeight }]}
    >
      {status === 'loading' && (
        <Skeleton
          height={containerHeight}
          twClassName="rounded-lg"
          testID={BRAZE_BANNER_TEST_IDS.SKELETON}
        />
      )}

      {status === 'visible' && banner && (
        <>
          <BrazeBannerWebView banner={banner} />
          <Pressable
            testID={BRAZE_BANNER_TEST_IDS.PRESSABLE}
            onPress={handlePress}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            testID={BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON}
            onPress={dismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={tw.style('absolute top-2 right-2 z-10 p-1')}
          >
            <Icon
              name={IconName.Close}
              size={IconSize.Sm}
              color={MMDSIconColor.IconDefault}
            />
          </Pressable>
        </>
      )}
    </Box>
  );
};

export default BrazeBanner;
