/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../../../hooks/useStyles';
import { DEFAULT_AVATAR_SIZE } from '../../../../Avatar.constants';

// Internal dependencies.
import { AvatarBaseBaseProps } from './AvatarBaseBase.types';
import styleSheet from './AvatarBaseBase.styles';
import { AVATAR_BASE_BASE_TEST_ID } from './AvatarBaseBase.constants';

const AvatarBaseBase: React.FC<AvatarBaseBaseProps> = ({
  size = DEFAULT_AVATAR_SIZE,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return (
    <View style={styles.base} testID={AVATAR_BASE_BASE_TEST_ID}>
      {children}
    </View>
  );
};

export default AvatarBaseBase;
