import React from 'react';
import { Image } from 'expo-image';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { AvatarPredictProps } from './AvatarPredict.types';
import { AvatarPredictSelectorsIDs } from './AvatarPredict.testIds';

/**
 * Prediction market or position image rendered through AvatarBase.
 */
const AvatarPredict = ({
  uri,
  size = AvatarBaseSize.Lg,
  shape = AvatarBaseShape.Square,
  testID = AvatarPredictSelectorsIDs.CONTAINER,
  ...props
}: AvatarPredictProps) => {
  const tw = useTailwind();

  return (
    <AvatarBase size={size} shape={shape} testID={testID} {...props}>
      {uri ? (
        <Image
          source={{ uri }}
          style={tw.style('w-full h-full')}
          contentFit="cover"
          testID={AvatarPredictSelectorsIDs.IMAGE}
        />
      ) : null}
    </AvatarBase>
  );
};

export default AvatarPredict;
