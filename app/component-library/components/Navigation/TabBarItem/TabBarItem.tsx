/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';
import Icon, { IconSize } from '../../Icons/Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies
import styleSheet from './TabBarItem.styles';
import { TabBarItemProps } from './TabBarItem.types';

const TabBarItem = ({
  style,
  label,
  icon,
  isSelected,
  iconSize = IconSize.Lg,
  iconColor,
  iconContainerStyle,
  ...props
}: TabBarItemProps) => {
  const { styles, theme } = useStyles(styleSheet, { style, isSelected });
  const tabColor = useMemo(
    () =>
      isSelected ? theme.colors.primary.default : theme.colors.icon.alternative,
    [isSelected, theme],
  );

  return (
    <TouchableOpacity {...props} style={styles.base}>
      <View style={iconContainerStyle}>
        <Icon size={iconSize} name={icon} color={iconColor || tabColor} />
      </View>
      {label && (
        <Text variant={TextVariant.BodySM} style={styles.label}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default TabBarItem;
