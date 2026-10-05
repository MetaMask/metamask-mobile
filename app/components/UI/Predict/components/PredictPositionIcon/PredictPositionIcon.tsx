import React from 'react';
import { Image } from 'expo-image';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface PredictPositionIconProps {
  uri?: string;
  twClassName?: string;
  testID?: string;
}

const PredictPositionIcon = ({
  uri,
  twClassName,
  testID,
}: PredictPositionIconProps) => {
  const tw = useTailwind();

  if (!uri) {
    return (
      <Box
        testID={testID}
        style={tw.style(
          'w-10 h-10 rounded-lg bg-background-alternative',
          twClassName,
        )}
      />
    );
  }

  return (
    <Image
      testID={testID}
      source={{ uri }}
      contentFit="cover"
      style={tw.style('w-10 h-10 rounded-lg', twClassName)}
    />
  );
};

export default PredictPositionIcon;
