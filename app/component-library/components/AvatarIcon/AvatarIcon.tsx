/* eslint-disable react/prop-types */
import React from 'react';
import { useStyles } from '../../../component-library/hooks';
import Avatar, { AvatarSize } from '../Avatar';
import Icon, { IconSize } from '../Icon';
import stylesheet from './AvatarIcon.styles';
import { AvatarIconProps, IconSizeByAvatarSize } from './AvatarIcon.types';

const iconSizeByAvatarSize: IconSizeByAvatarSize = {
  [AvatarSize.Xs]: IconSize.Xs,
  [AvatarSize.Sm]: IconSize.Sm,
  [AvatarSize.Md]: IconSize.Md,
  [AvatarSize.Lg]: IconSize.Lg,
  [AvatarSize.Xl]: IconSize.Xl,
};

const AvatarIcon = ({ size, icon, style, ...props }: AvatarIconProps) => {
  const { styles, theme } = useStyles(stylesheet, { style });
  const iconSize = iconSizeByAvatarSize[size];

  return (
    <Avatar size={size} style={styles.base} {...props}>
      <Icon name={icon} size={iconSize} color={theme.colors.primary.default} />
    </Avatar>
  );
};

export default AvatarIcon;
