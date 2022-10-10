/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import Text from '../../../../../../Texts/Text';

// External dependencies.
import { useStyles } from '../../../../../../../hooks';

// Internal dependencies.
import styleSheet from './AvatarAssetInitial.styles';
import { AvatarAssetInitialProps } from './AvatarAssetInitial.types';
import { TEXT_VARIANT_BY_AVATAR_SIZE } from './AvatarAssetInitial.constants';

const AvatarAssetInitial = ({
  style,
  initial,
  size,
  ...props
}: AvatarAssetInitialProps) => {
  const { styles } = useStyles(styleSheet, { style, size });
  const initialFirstLetter: string = initial?.[0];

  return (
    <View style={styles.base} {...props}>
      <Text variant={TEXT_VARIANT_BY_AVATAR_SIZE[size]}>
        {initialFirstLetter}
      </Text>
    </View>
  );
};

export default AvatarAssetInitial;
