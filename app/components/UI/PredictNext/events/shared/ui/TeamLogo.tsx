import React, { useState } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Image as ExpoImage } from 'expo-image';
import type { PredictTeam } from '../../../types';

export type TeamLogoSize =
  | 'small'
  | 'medium'
  | 'large'
  | 'largeWide'
  | 'xlarge';

const SIZE_CLASS_NAMES: Record<TeamLogoSize, string> = {
  small: 'h-8 w-8',
  medium: 'h-10 w-10',
  large: 'h-12 w-12',
  // Helmet-shaped logos are drawn wider than tall.
  largeWide: 'h-12 w-[52px]',
  xlarge: 'h-14 w-14',
};

/** The abbreviation fallback stays a circle at every size. */
const FALLBACK_CLASS_NAMES: Record<TeamLogoSize, string> = {
  ...SIZE_CLASS_NAMES,
  largeWide: SIZE_CLASS_NAMES.large,
};

const FALLBACK_TEXT: Record<
  TeamLogoSize,
  { variant: TextVariant; fontWeight: FontWeight }
> = {
  small: { variant: TextVariant.BodyXs, fontWeight: FontWeight.Medium },
  medium: { variant: TextVariant.BodyXs, fontWeight: FontWeight.Medium },
  large: { variant: TextVariant.BodyXs, fontWeight: FontWeight.Medium },
  largeWide: { variant: TextVariant.BodyXs, fontWeight: FontWeight.Medium },
  xlarge: { variant: TextVariant.BodySm, fontWeight: FontWeight.Bold },
};

export interface TeamLogoProps {
  team: PredictTeam;
  /** Shown when the Team has no logo or it fails to load. */
  abbreviation: string;
  size?: TeamLogoSize;
  /**
   * Mirror the image horizontally so it faces its opponent; see
   * `shouldMirrorTeamLogo`. The abbreviation fallback is never mirrored.
   */
  flipped?: boolean;
  testID?: string;
  fallbackTestID?: string;
}

/** A Team's logo, falling back to its abbreviation. Decorative for a11y. */
export const TeamLogo = ({
  team,
  abbreviation,
  size = 'small',
  flipped = false,
  testID,
  fallbackTestID,
}: TeamLogoProps) => {
  const tw = useTailwind();
  const [failed, setFailed] = useState(false);
  const showImage = team.logoUrl && !failed;
  const sizeClassName = SIZE_CLASS_NAMES[size];

  return (
    <Box
      twClassName={`${sizeClassName} items-center justify-center`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showImage ? (
        <ExpoImage
          source={team.logoUrl}
          style={
            flipped
              ? [tw.style(sizeClassName), { transform: [{ scaleX: -1 }] }]
              : tw.style(sizeClassName)
          }
          contentFit="contain"
          recyclingKey={team.logoUrl}
          onError={() => setFailed(true)}
          testID={testID}
        />
      ) : (
        <Box
          twClassName={`${FALLBACK_CLASS_NAMES[size]} items-center justify-center rounded-full bg-muted`}
        >
          <Text
            variant={FALLBACK_TEXT[size].variant}
            fontWeight={FALLBACK_TEXT[size].fontWeight}
            testID={fallbackTestID}
          >
            {abbreviation}
          </Text>
        </Box>
      )}
    </Box>
  );
};
