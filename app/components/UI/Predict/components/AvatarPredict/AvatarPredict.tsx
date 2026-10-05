import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet } from 'react-native';

const imageStyle = StyleSheet.create({
  fill: { height: '100%', width: '100%' },
});

interface AvatarPredictProps {
  uri?: string;
  size?: AvatarBaseSize;
  shape?: AvatarBaseShape;
  twClassName?: string;
  testID?: string;
}

/**
 * Prediction image. Defaults to the 40px square avatar, whose radius comes
 * from AvatarBase rather than a one-off border radius.
 */
const AvatarPredict = ({
  uri,
  size = AvatarBaseSize.Lg,
  shape = AvatarBaseShape.Square,
  twClassName,
  testID,
}: AvatarPredictProps) => (
  <AvatarBase
    size={size}
    shape={shape}
    twClassName={twClassName}
    testID={testID}
  >
    {uri ? (
      <Image source={{ uri }} style={imageStyle.fill} contentFit="cover" />
    ) : null}
  </AvatarBase>
);

export default AvatarPredict;
