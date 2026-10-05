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
 * Prediction market or position image. Shape stays square so every call site
 * uses the same AvatarBase radius.
 */
const AvatarPredict = ({
  src,
  size = AvatarBaseSize.Lg,
  twClassName,
  testID = AvatarPredictSelectorsIDs.CONTAINER,
}: AvatarPredictProps) => {
  const tw = useTailwind();

  return (
    <AvatarBase
      size={size}
      shape={AvatarBaseShape.Square}
      twClassName={twClassName}
      testID={testID}
    >
      {src?.uri ? (
        <Image
          source={{ uri: src.uri }}
          style={tw.style('w-full h-full')}
          contentFit="cover"
          testID={AvatarPredictSelectorsIDs.IMAGE}
        />
      ) : null}
    </AvatarBase>
  );
};

export default AvatarPredict;
