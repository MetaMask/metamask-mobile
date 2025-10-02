/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
import React from 'react';
import { Image, ImageStyle } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface SeasonTierImageProps {
  tierOrder: number;
  twClassName?: string;
  style?: ImageStyle;
  testID?: string;
}

// Mapping of tier orders to their respective images
const TIER_IMAGE_MAPPING = {
  1: require('../../../../../images/rewards/tiers/rewards-s1-tier-1.png'),
} as const;

const SeasonTierImage: React.FC<SeasonTierImageProps> = ({
  tierOrder,
  twClassName,
  style,
  testID,
}) => {
  const tw = useTailwind();

  // Get the image source based on tier order, fallback to tier 1 if not found
  const imageSource =
    TIER_IMAGE_MAPPING[tierOrder as keyof typeof TIER_IMAGE_MAPPING] ||
    TIER_IMAGE_MAPPING[1];

  return (
    <Image
      source={imageSource}
      style={[twClassName && tw.style(twClassName), style]}
      resizeMode="contain"
      testID={testID}
    />
  );
};

export default SeasonTierImage;
