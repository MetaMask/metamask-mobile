import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Braze from '@braze/react-native-sdk';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const DEFAULT_MAX_BANNER_HEIGHT = 200;

interface BrazeBannerProps {
  placementId: string;
  maxHeight?: number;
}

/**
 * Renders the Braze Banner for the given placement ID.
 *
 * `Braze.BrazeBannerView` is fully self-managing on both iOS and Android: the
 * native view registers itself directly with the Braze SDK on init and receives
 * content updates automatically.
 *
 * Height starts at 0 and is driven entirely by `onHeightChanged` — the
 * container expands to the SDK-reported height, capped at `maxHeight`
 * to prevent an oversized campaign from breaking the layout.
 *
 * On dismissal, a banner click is logged, a data flush is requested, and
 * banners are refreshed so the next campaign can be fetched and cached.
 */
const BrazeBanner = ({
  placementId,
  maxHeight = DEFAULT_MAX_BANNER_HEIGHT,
}: BrazeBannerProps) => {
  const tw = useTailwind();
  const [height, setHeight] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleHeightChanged = (newHeight: number) => {
    setHeight(Math.min(newHeight, maxHeight));
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    Braze.logBannerClick(placementId, null);
    Braze.requestImmediateDataFlush();
    Braze.requestBannersRefresh([placementId]);
  };

  if (isDismissed) return null;

  const isContentReady = height > 0;

  return (
    <Box
      testID={isContentReady ? BRAZE_BANNER_TEST_IDS.CONTAINER : undefined}
      style={[tw.style('mx-4 relative'), { height }]}
    >
      <Braze.BrazeBannerView
        placementID={placementId}
        onHeightChanged={handleHeightChanged}
        style={StyleSheet.absoluteFillObject}
      />

      {isContentReady && (
        <Box style={tw.style('absolute top-2 right-2 z-10')}>
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
