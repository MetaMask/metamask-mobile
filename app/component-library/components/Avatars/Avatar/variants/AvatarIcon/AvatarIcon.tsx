/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import Icon from '../../../../Icon';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import stylesheet from './AvatarIcon.styles';
import { AvatarIconProps } from './AvatarIcon.types';
import { ICON_SIZE_BY_AVATAR_SIZE } from './AvatarIcon.constants';

const AvatarIcon = ({
  size = AvatarSize.Md,
  name,
  style,
  ...props
}: AvatarIconProps) => {
  const { styles, theme } = useStyles(stylesheet, { style });
  const iconSize = ICON_SIZE_BY_AVATAR_SIZE[size];

  return (
    <AvatarBase size={size} style={styles.base} {...props}>
      <Icon name={name} size={iconSize} color={theme.colors.primary.default} />
    </AvatarBase>
  );
};

export default AvatarIcon;
