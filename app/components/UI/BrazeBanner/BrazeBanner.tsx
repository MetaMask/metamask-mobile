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
  isGlass?: boolean;
}

/**
 * Orchestrates the Braze banner lifecycle for a given placement ID.
 *
 * Uses `useBrazeBanner` to resolve the placement and `BrazeBannerCard` to
 * render a visible banner. Logs impressions and clicks for the placement.
 * MetaMask deeplinks use the shared deeplink pipeline; external web links open
 * with the OS browser.
 */
const BrazeBanner = ({ placementId, isGlass = false }: BrazeBannerProps) => {
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
    if (status === 'visible' || status === 'control') {
      logBrazeBannerImpression(
        placementId,
        status === 'control' ? null : eventProperties,
      );
    }
  }, [status, placementId, eventProperties]);

  const handlePress = useCallback(() => {
    const isInternalDeeplink = Boolean(
      deeplink && isAllowedBrazeDeeplink(deeplink),
    );
    const isExternalUrl = Boolean(
      deeplink && isAllowedBrazeExternalUrl(deeplink),
    );

    // A configured deeplink that fails the allowlist is a broken campaign:
    // reject the tap without logging a select so it does not feed targeting.
    if (deeplink && !isInternalDeeplink && !isExternalUrl) {
      Logger.error(new Error('BrazeBanner: deeplink rejected by allowlist'), {
        placementId,
        deeplink,
      });
      return;
    }

    // Every tap counts as a select, including banners with no deeplink, so
    // campaigns can trigger full-screen in-app messages from the banner.
    logBrazeBannerClick(placementId, eventProperties);

    if (!deeplink) {
      return;
    }

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
  }, [deeplink, eventProperties, placementId]);

  if (status !== 'visible') return null;

  return body ? (
    <Box testID={BRAZE_BANNER_TEST_IDS.CONTAINER} style={tw.style('mx-4')}>
      <Pressable testID={BRAZE_BANNER_TEST_IDS.PRESSABLE} onPress={handlePress}>
        <BrazeBannerCard
          title={title}
          body={body}
          imageUrl={imageUrl}
          ctaLabel={ctaLabel}
          onDismiss={dismiss}
          isGlass={isGlass}
        />
      </Pressable>
    </Box>
  ) : null;
};

export default BrazeBanner;
