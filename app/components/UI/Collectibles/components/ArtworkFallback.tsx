import React from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { View } from '../../primitives/View';

interface Props {
  className?: string;
  testID?: string;
}

export function ArtworkFallback({ className = '', testID }: Props) {
  return (
    <View
      className={`items-center justify-center bg-muted ${className}`}
      testID={testID}
    >
      <Icon
        name={IconName.Image}
        size={IconSize.Xl}
        color={IconColor.IconAlternative}
      />
    </View>
  );
}
