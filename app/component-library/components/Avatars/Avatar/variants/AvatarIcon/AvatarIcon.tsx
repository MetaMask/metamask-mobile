/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import Icon from '../../../../Icons/Icon';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import stylesheet from './AvatarIcon.styles';
import { AvatarIconProps } from './AvatarIcon.types';
import { ICON_SIZE_BY_AVATAR_SIZE } from './AvatarIcon.constants';

const AvatarIcon = ({
  size = AvatarSize.Md,
  name,
  style,
  iconColor: iconColorProp,
  backgroundColor,
  ...props
}: AvatarIconProps) => {
  const { styles, theme } = useStyles(stylesheet, { style, backgroundColor });
  const iconSize = ICON_SIZE_BY_AVATAR_SIZE[size];
  const iconColor = iconColorProp || theme.colors.primary.default;

  return (
    <AvatarBase size={size} style={styles.base} {...props}>
      <Icon name={name} size={iconSize} color={iconColor} />
    </AvatarBase>
  );
};

export default AvatarIcon;
