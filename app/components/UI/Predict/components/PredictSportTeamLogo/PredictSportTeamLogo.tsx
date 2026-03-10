import React, { useState } from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';

interface PredictSportTeamLogoProps {
  uri: string; // Remote image URL (team.logo field)
  color: string; // Team primary color (hex) — used as placeholder background
  size?: number; // Size in pixels (default: 48, same as helmet default)
  flipped?: boolean; // Accepted for API compatibility but IGNORED (logos don't need mirroring)
  testID?: string;
}

/**
 * Sport team logo component with dynamic team color background.
 * Used as the default team representation when a sport league config does not provide a custom TeamIcon component.
 */
const PredictSportTeamLogo: React.FC<PredictSportTeamLogoProps> = ({
  uri,
  color,
  size = 48,
  testID,
}) => {
  const tw = useTailwind();
  const [hasError, setHasError] = useState(false);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      testID={testID}
      style={tw.style('overflow-hidden', {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      })}
    >
      {!hasError && (
        <Image
          source={{ uri }}
          style={tw.style({ width: size, height: size })}
          resizeMode="contain"
          onError={() => setHasError(true)}
          testID={testID ? `${testID}-image` : undefined}
        />
      )}
    </Box>
  );
};

export default PredictSportTeamLogo;
