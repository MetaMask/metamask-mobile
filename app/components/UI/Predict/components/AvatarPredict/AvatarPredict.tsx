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
  testID?: string;
}

/**
 * Prediction image. The previous rows were 40px with an 8px radius, so this
 * uses the closest AvatarBase tokens: Lg (40px) and Square (10px at that size).
 */
const AvatarPredict = ({
  uri,
  size = AvatarBaseSize.Lg,
  shape = AvatarBaseShape.Square,
  testID,
}: AvatarPredictProps) => (
  <AvatarBase size={size} shape={shape} testID={testID}>
    {uri ? (
      <Image source={{ uri }} style={imageStyle.fill} contentFit="cover" />
    ) : null}
  </AvatarBase>
);

export default AvatarPredict;
