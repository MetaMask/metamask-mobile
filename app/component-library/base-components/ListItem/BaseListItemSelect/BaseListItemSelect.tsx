/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import BaseListItemBase from '../BaseListItem/foundation/BaseListItemBase';

// Internal dependencies.
import styleSheet from './BaseListItemSelect.styles';
import { BaseListItemSelectProps } from './BaseListItemSelect.types';
import { DEFAULT_BASELISTITEMSELECT_GAP } from './BaseListItemSelect.constants';

const BaseListItemSelect: React.FC<BaseListItemSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  onPress,
  onLongPress,
  gap = DEFAULT_BASELISTITEMSELECT_GAP,
  verticalAlignment,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });

  return (
    <TouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onPress={onPress}
      onLongPress={onLongPress}
      {...props}
    >
      <BaseListItemBase gap={gap} style={styles.listItem}>
        {children}
      </BaseListItemBase>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible>
          <View style={styles.underlayBar} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default BaseListItemSelect;
