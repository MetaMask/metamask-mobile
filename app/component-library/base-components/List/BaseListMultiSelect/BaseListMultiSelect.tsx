/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import BaseList from '../BaseList/BaseList';
import { BaseListItemMultiSelectProps } from '../../ListItem/BaseListItemMultiSelect/BaseListItemMultiSelect.types';
import BaseListItemMultiSelect from '../../ListItem/BaseListItemMultiSelect';

// Internal dependencies.
import { BaseListMultiSelectProps } from './BaseListMultiSelect.types';

const BaseListMultiSelect: React.FC<BaseListMultiSelectProps> = ({
  style,
  options,
  ...props
}) => {
  const renderListItem = (
    option: BaseListItemMultiSelectProps,
    index: number,
  ) => {
    let isSelected = option.isSelected;
    const onPressHandler = (event: GestureResponderEvent) => {
      option.onPress?.(event);
      isSelected = !isSelected;
    };
    return (
      <BaseListItemMultiSelect
        {...option}
        key={index}
        onPress={onPressHandler}
        isSelected={isSelected}
      />
    );
  };

  return (
    <BaseList {...props}>
      {options.map((option: BaseListItemMultiSelectProps, index) =>
        renderListItem(option, index),
      )}
    </BaseList>
  );
};

export default BaseListMultiSelect;
