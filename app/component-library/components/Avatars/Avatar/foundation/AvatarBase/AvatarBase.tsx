/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks/useStyles';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarBaseProps } from './AvatarBase.types';
import styleSheet from './AvatarBase.styles';
import { AVATAR_BASE_TEST_ID } from './AvatarBase.constants';

const AvatarBase: React.FC<AvatarBaseProps> = ({
  size = DEFAULT_AVATAR_SIZE,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return (
    <View style={styles.base} testID={AVATAR_BASE_TEST_ID}>
      {children}
    </View>
  );
};

export default AvatarBase;
