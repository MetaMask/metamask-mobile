/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks/useStyles';
import BadgeWrapper from '../../BadgeWrapper';

// Internal dependencies.
import { AvatarBaseProps, AvatarBaseSize } from './AvatarBase.types';
import styleSheet from './AvatarBase.styles';

const AvatarBase: React.FC<AvatarBaseProps> = ({
  size = AvatarBaseSize.Md,
  badge,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
    badge,
  });

  const renderChildren = () => <View style={styles.container}>{children}</View>;
  const renderChildrenWithBadge = () => (
    <BadgeWrapper contentStyle={styles.badgeContent} content={badge?.content}>
      {renderChildren()}
    </BadgeWrapper>
  );

  return badge ? renderChildrenWithBadge() : renderChildren();
};

export default AvatarBase;
