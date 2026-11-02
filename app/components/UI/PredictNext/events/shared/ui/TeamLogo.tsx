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

export type TeamLogoSize = 'small' | 'medium' | 'large';

const SIZE_CLASS_NAMES: Record<TeamLogoSize, string> = {
  small: 'h-8 w-8',
  medium: 'h-10 w-10',
  large: 'h-12 w-12',
};

export interface TeamLogoProps {
  team: PredictTeam;
  /** Shown when the Team has no logo or it fails to load. */
  abbreviation: string;
  size?: TeamLogoSize;
  testID?: string;
  fallbackTestID?: string;
}

/** A Team's logo, falling back to its abbreviation. Decorative for a11y. */
export const TeamLogo = ({
  team,
  abbreviation,
  size = 'small',
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
          style={tw.style(sizeClassName)}
          contentFit="contain"
          recyclingKey={team.logoUrl}
          onError={() => setFailed(true)}
          testID={testID}
        />
      ) : (
        <Box
          twClassName={`${sizeClassName} items-center justify-center rounded-full bg-muted`}
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            testID={fallbackTestID}
          >
            {abbreviation}
          </Text>
        </Box>
      )}
    </Box>
  );
};
