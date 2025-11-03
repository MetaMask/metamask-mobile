/* eslint-disable react/prop-types */

/**
 * @deprecated Please update your code to use `AvatarBase` from `@metamask/design-system-react-native`
 */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks/useStyles';

// Internal dependencies.
import { AvatarBaseProps } from './AvatarBase.types';
import styleSheet from './AvatarBase.styles';
import { DEFAULT_AVATARBASE_SIZE } from './AvatarBase.constants';

const AvatarBase: React.FC<AvatarBaseProps> = ({
  size = DEFAULT_AVATARBASE_SIZE,
  style,
  children,
  includesBorder = false,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
    includesBorder,
  });

  return (
    <View style={styles.container} {...props}>
      {children}
    </View>
  );
};

export default AvatarBase;
