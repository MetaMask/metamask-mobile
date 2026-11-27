import React from 'react';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const PROGRESS_RING_SIZE = 54;
const PROGRESS_RING_STROKE_WIDTH = 4;

export interface ProgressLogoProps {
  imageUrl?: string;
  /** Share of the ring that stays filled, from 0 to 1. */
  progress: number;
  color: string;
  trackColor: string;
}

/**
 * A round logo inside a progress ring. Moved from
 * `PredictCryptoUpDownMarketCard` without behaviour change.
 */
const ProgressLogo = React.memo(
  ({ imageUrl, progress, color, trackColor }: ProgressLogoProps) => {
    const tw = useTailwind();
    const ringSize = PROGRESS_RING_SIZE;
    const strokeWidth = PROGRESS_RING_STROKE_WIDTH;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <Box
        twClassName="items-center justify-center"
        style={tw.style({ width: ringSize, height: ringSize })}
      >
        <Box twClassName="absolute inset-0">
          <Svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={trackColor}
              strokeOpacity={0.7}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
        </Box>
        <Box twClassName="h-10 w-10 overflow-hidden rounded-full bg-default">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={tw.style('h-full w-full')}
              contentFit="cover"
              recyclingKey={imageUrl}
            />
          ) : (
            <Box twClassName="h-full w-full bg-muted" />
          )}
        </Box>
      </Box>
    );
  },
);
ProgressLogo.displayName = 'ProgressLogo';

export default ProgressLogo;
