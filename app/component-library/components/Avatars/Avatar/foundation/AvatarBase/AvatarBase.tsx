/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External depdendencies.
import { useStyles } from '../../../../../hooks/useStyles';
import CirclePattern from '../../../../../patterns/Circles/Circle/Circle';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarBaseProps } from './AvatarBase.types';
import styleSheet from './AvatarBase.styles';
import { AVATAR_BASE_TEST_ID } from './AvatarBase.constants';

const AvatarBase: React.FC<AvatarBaseProps> = ({
  size = DEFAULT_AVATAR_SIZE,
  style,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  return (
    <CirclePattern
      style={styles.base}
      size={size}
      testID={AVATAR_BASE_TEST_ID}
      {...props}
    >
      {children}
    </CirclePattern>
  );
};

export default AvatarBase;
