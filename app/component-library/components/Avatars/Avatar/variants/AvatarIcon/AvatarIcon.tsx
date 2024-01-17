/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import Icon from '../../../../Icons/Icon';
import { useStyles } from '../../../../../hooks';
import { ICONSIZE_BY_AVATARSIZE } from '../../Avatar.constants';

// Internal dependencies.
import stylesheet from './AvatarIcon.styles';
import { AvatarIconProps } from './AvatarIcon.types';
import { DEFAULT_AVATARICON_SIZE } from './AvatarIcon.constants';

const AvatarIcon = ({
  size = DEFAULT_AVATARICON_SIZE,
  name,
  style,
  iconColor: iconColorProp,
  backgroundColor,
  ...props
}: AvatarIconProps) => {
  const { styles } = useStyles(stylesheet, { style, backgroundColor });
  const iconSize = ICONSIZE_BY_AVATARSIZE[size];
  const iconColor = iconColorProp || styles.icon.color;

  return (
    <AvatarBase size={size} style={styles.base} {...props}>
      <Icon name={name} size={iconSize} color={iconColor} />
    </AvatarBase>
  );
};

export default AvatarIcon;
