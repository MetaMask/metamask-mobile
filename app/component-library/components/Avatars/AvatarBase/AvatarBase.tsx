/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks/useStyles';
import Badge from '../../Badge';

// Internal dependencies.
import {
  AvatarBaseProps,
  AvatarBaseSize,
  AvatarBadgePositionVariant,
} from './AvatarBase.types';
import styleSheet from './AvatarBase.styles';

const AvatarBase: React.FC<AvatarBaseProps> = ({
  size = AvatarBaseSize.Md,
  badgeContent,
  badgePosition = AvatarBadgePositionVariant.TopRight,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
    badgePosition,
  });

  const renderChildren = () => <View style={styles.container}>{children}</View>;
  const renderChildrenWithBadge = () => (
    <Badge badgeContentStyle={styles.badgeContent} badgeContent={badgeContent}>
      {renderChildren()}
    </Badge>
  );

  return badgeContent ? renderChildrenWithBadge() : renderChildren();
};

export default AvatarBase;
