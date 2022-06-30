/* eslint-disable react/prop-types */
import React from 'react';
import { useStyles } from '../../../component-library/hooks';
import BaseAvatar, { BaseAvatarSize } from '../BaseAvatar';
import Icon, { IconSize } from '../Icon';
import stylesheet from './AvatarIcon.styles';
import { AvatarIconProps, IconSizeByAvatarSize } from './AvatarIcon.types';

const iconSizeByAvatarSize: IconSizeByAvatarSize = {
  [BaseAvatarSize.Xs]: IconSize.Xs,
  [BaseAvatarSize.Sm]: IconSize.Sm,
  [BaseAvatarSize.Md]: IconSize.Md,
  [BaseAvatarSize.Lg]: IconSize.Lg,
  [BaseAvatarSize.Xl]: IconSize.Xl,
};

const AvatarIcon = ({ size, icon, style, ...props }: AvatarIconProps) => {
  const { styles, theme } = useStyles(stylesheet, { style });
  const iconSize = iconSizeByAvatarSize[size];

  return (
    <BaseAvatar size={size} style={styles.base} {...props}>
      <Icon name={icon} size={iconSize} color={theme.colors.primary.default} />
    </BaseAvatar>
  );
};

export default AvatarIcon;
