/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies
import styleSheet from './TabBarItem.styles';
import { TabBarItemProps } from './TabBarItem.types';
import Avatar, { AvatarVariants } from '../../Avatars/Avatar';

const TabBarItem = ({
  style,
  icon,
  iconSize,
  iconColor,
  iconBackgroundColor,
  ...props
}: TabBarItemProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <TouchableOpacity {...props} style={styles.base}>
      <Avatar
        variant={AvatarVariants.Icon}
        name={icon}
        size={iconSize}
        backgroundColor={iconBackgroundColor}
        iconColor={iconColor}
      />
    </TouchableOpacity>
  );
};

export default TabBarItem;
