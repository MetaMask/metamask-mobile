import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ProgressLogo from './ProgressLogo';
import { useSharedNowMs } from './sharedClock';
import {
  formatWindowCountdown,
  getWindowProgressRemaining,
} from './windowClock';

export interface LiveStatusProps {
  /** ISO timestamp of the window end. */
  endsAt?: string;
  /** Window length in ms. It sets how fast the ring empties. */
  durationMs: number;
  imageUrl?: string;
  accentColor: string;
  trackColor: string;
  compact?: boolean;
  /** `testID` of the "LIVE · mm:ss" badge. */
  badgeTestID?: string;
}

/**
 * A progress-ring logo and a "LIVE · mm:ss" badge that tick on the shared
 * clock. The non-compact layout uses absolute offsets made for the legacy
 * Up/Down feed card. Moved from `PredictCryptoUpDownMarketCard` without
 * behaviour change.
 */
const LiveStatus = React.memo(
  ({
    endsAt,
    durationMs,
    imageUrl,
    accentColor,
    trackColor,
    compact,
    badgeTestID,
  }: LiveStatusProps) => {
    const tw = useTailwind();
    const nowMs = useSharedNowMs();
    const countdown = formatWindowCountdown({ endsAt }, nowMs);
    const progressRemaining = getWindowProgressRemaining(
      { endsAt },
      nowMs,
      durationMs,
    );

    const logo = (
      <ProgressLogo
        imageUrl={imageUrl}
        progress={progressRemaining}
        color={accentColor}
        trackColor={trackColor}
      />
    );

    const badge = (
      <Box
        testID={badgeTestID}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Box
          twClassName="mr-1.5 h-2 w-2 rounded-full"
          style={tw.style({ backgroundColor: accentColor })}
        />
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          style={tw.style({ color: accentColor })}
        >
          LIVE · {countdown}
        </Text>
      </Box>
    );

    if (compact) {
      return (
        <Box twClassName="items-center gap-2">
          {logo}
          {badge}
        </Box>
      );
    }

    return (
      <>
        <Box twClassName="absolute left-0 right-0 top-[112px] items-center px-4">
          {logo}
        </Box>
        <Box twClassName="absolute left-0 right-0 top-[171px] items-center">
          {badge}
        </Box>
      </>
    );
  },
);
LiveStatus.displayName = 'LiveStatus';

export default LiveStatus;
