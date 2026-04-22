import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Braze, { Banner } from '@braze/react-native-sdk';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
  Skeleton,
} from '@metamask/design-system-react-native';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../util/Logger';

const DEFAULT_BANNER_HEIGHT = 96;

type Status = 'loading' | 'visible' | 'hidden';

interface BrazeBannerProps {
  placementId: string;
  maxHeight?: number;
}

/**
 * Renders the Braze Banner for the given placement ID.
 *
 * Visibility is driven by the `BANNER_CARDS_UPDATED` event payload. The banner
 * is shown only when the SDK delivers a banner with non-empty HTML for this
 * placement. Call `setBrazeUser()` before mounting so the SDK fires the event
 * with fresh server data.
 *
 * The container is given a stable height (`maxHeight`) so siblings below the
 * banner never reflow while the WebView paints its HTML.
 *
 * The skeleton is rendered as an absolutely-positioned overlay on top of the
 * WebView and removed once the WebView reports its content height via
 * `onHeightChanged`.
 *
 * The WebView is eagerly mounted (at opacity 0) as soon as `status` becomes
 * `visible` so the native SDK can begin parsing the banner HTML in parallel
 * with the JS state transition — this saves ~600ms compared with waiting for
 * `isContentReady` before mounting the WebView.
 *
 * Dismissal is stored in local state and is therefore session-scoped. The
 * dismiss action logs a banner click via `Braze.logBannerClick`.
 *
 * The Braze SDK fires up to 6 identical `BANNER_CARDS_UPDATED` events per
 * server update. `lastBrazeStatus` deduplicates these so state only updates
 * on a genuine status change.
 */
const BrazeBanner = ({
  placementId,
  maxHeight = DEFAULT_BANNER_HEIGHT,
}: BrazeBannerProps) => {
  const tw = useTailwind();
  const [status, setStatus] = useState<Status>('loading');
  const [isContentReady, setIsContentReady] = useState(false);
  const [isSkeletonMounted, setIsSkeletonMounted] = useState(true);

  // Deduplicate the multiple identical BANNER_CARDS_UPDATED events Braze fires
  // per update by tracking the last resolved status and bailing on repeats.
  const lastBrazeStatus = useRef<Status | null>(null);

  const handleHeightChanged = () => {
    setIsContentReady(true);
  };

  useEffect(() => {
    const subscription = Braze.addListener(
      Braze.Events.BANNER_CARDS_UPDATED,
      (update) => {
        const banner = update?.banners?.find(
          (b: Banner) => b.placementId === placementId,
        );

        Logger.log(`[BrazeBanner] Banner updated: ${banner?.html?.length}`);
        const nextStatus: Status = banner?.html ? 'visible' : 'hidden';

        if (lastBrazeStatus.current === nextStatus) return;
        lastBrazeStatus.current = nextStatus;

        setStatus(nextStatus);
      },
    );

    return () => subscription.remove();
  }, [placementId]);

  // Remove skeleton once the WebView has reported its content height.
  useEffect(() => {
    if (status === 'visible' && isContentReady) {
      setIsSkeletonMounted(false);
    }
  }, [status, isContentReady]);

  const handleDismiss = () => {
    setStatus('hidden');
    Braze.logBannerClick(placementId, null);
  };

  if (status === 'hidden') return null;

  const isVisible = status === 'visible';

  return (
    <Box
      testID={isVisible ? BRAZE_BANNER_TEST_IDS.CONTAINER : undefined}
      style={[tw.style('mx-4 relative'), { height: maxHeight }]}
    >
      {/* Eager-mount the WebView as soon as we know there is a banner.
          This lets the native SDK parse and paint the HTML in parallel with
          the JS state transition, saving ~600ms off time-to-visible.
          The WebView is hidden (opacity 0) until onHeightChanged fires. */}
      {isVisible && (
        <Braze.BrazeBannerView
          placementID={placementId}
          onHeightChanged={handleHeightChanged}
          style={[
            StyleSheet.absoluteFillObject,
            tw.style(isContentReady ? 'opacity-100' : 'opacity-0'),
          ]}
        />
      )}

      {isSkeletonMounted && (
        <Box pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <Skeleton
            width={'100%'}
            height={'100%'}
            style={tw.style('rounded-2xl')}
          />
        </Box>
      )}

      {isVisible && (
        <Box
          pointerEvents={isContentReady ? 'auto' : 'none'}
          style={tw.style('absolute top-2 right-2 z-10')}
        >
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Sm}
            iconProps={{ color: MMDSIconColor.IconDefault }}
            onPress={handleDismiss}
            testID={BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        </Box>
      )}
    </Box>
  );
};

export default BrazeBanner;
