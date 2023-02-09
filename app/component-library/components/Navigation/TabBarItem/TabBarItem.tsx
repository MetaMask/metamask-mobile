/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';
import Icon, { IconSize } from '../../Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies
import styleSheet from './TabBarItem.styles';
import { TabBarItemProps } from './TabBarItem.types';

const TabBarItem = ({
  style,
  label,
  icon,
  isSelected,
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
      <Icon size={IconSize.Lg} name={icon} color={tabColor} />
      <Text variant={TextVariant.BodySM} style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default TabBarItem;
