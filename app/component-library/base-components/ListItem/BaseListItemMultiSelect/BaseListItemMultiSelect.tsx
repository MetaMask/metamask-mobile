/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { TouchableOpacity, View, GestureResponderEvent } from 'react-native';

// External dependencies.
import Checkbox from '../../../components/Checkbox';
import { useStyles } from '../../../hooks';
import BaseListItemBase from '../BaseListItem/foundation/BaseListItemBase';

// Internal dependencies.
import styleSheet from './BaseListItemMultiSelect.styles';
import { BaseListItemMultiSelectProps } from './BaseListItemMultiSelect.types';
import { DEFAULT_BASELISTITEMMULTISELECT_GAP } from './BaseListItemMultiSelect.constants';

const BaseListItemMultiSelect: React.FC<BaseListItemMultiSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_BASELISTITEMMULTISELECT_GAP,
  onPress,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });
  const { hitSlop, ...listItemProps } = props;
  const [isChecked, setIsChecked] = useState(isSelected);
  const onPressHandler = (event: GestureResponderEvent) => {
    onPress?.(event);
    setIsChecked(!isChecked);
  };
  return (
    <TouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onPress={onPressHandler}
      {...props}
    >
      <BaseListItemBase gap={gap} style={styles.listItem} {...listItemProps}>
        <Checkbox
          style={styles.checkbox}
          isChecked={isChecked}
          onPress={onPressHandler}
        />
        {children}
      </BaseListItemBase>
      {isChecked && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </TouchableOpacity>
  );
};

export default BaseListItemMultiSelect;
