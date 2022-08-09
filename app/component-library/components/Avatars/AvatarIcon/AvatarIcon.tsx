/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Avatar, { AvatarBaseSize } from '../AvatarBase';
import Icon from '../../Icon';
import { useStyles } from '../../../../component-library/hooks';

// Internal dependencies.
import stylesheet from './AvatarIcon.styles';
import { AvatarIconProps } from './AvatarIcon.types';
import { ICON_SIZE_BY_AVATAR_SIZE } from './AvatarIcon.constants';

const AvatarIcon = ({
  size = AvatarBaseSize.Md,
  name,
  style,
  ...props
}: AvatarIconProps) => {
  const { styles, theme } = useStyles(stylesheet, { style });
  const iconSize = ICON_SIZE_BY_AVATAR_SIZE[size];

  return (
    <Avatar size={size} style={styles.base} {...props}>
      <Icon name={name} size={iconSize} color={theme.colors.primary.default} />
    </Avatar>
  );
};

export default AvatarIcon;
