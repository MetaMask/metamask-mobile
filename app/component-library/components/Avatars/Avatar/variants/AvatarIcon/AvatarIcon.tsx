// Third party dependencies.
import React from 'react';
import Icon from '../../../../Icon';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import AvatarBase from '../../foundation/AvatarBase';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import { AvatarIconProps } from './AvatarIcon.types';
import {
  ICON_SIZE_BY_AVATAR_SIZE,
  AVATAR_ICON_TEST_ID,
  AVATAR_ICON_ICON_TEST_ID,
} from './AvatarIcon.constants';
import styleSheet from './AvatarIcon.styles';

const AvatarIcon = ({
  size = DEFAULT_AVATAR_SIZE,
  style,
  ...props
}: AvatarIconProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });
  return (
    <AvatarBase style={styles.base} size={size} testID={AVATAR_ICON_TEST_ID}>
      <Icon
        testID={AVATAR_ICON_ICON_TEST_ID}
        size={ICON_SIZE_BY_AVATAR_SIZE[size]}
        {...props}
      />
    </AvatarBase>
  );
};

export default AvatarIcon;
