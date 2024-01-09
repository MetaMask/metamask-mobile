/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import BaseList from '../BaseList/BaseList';
import { BaseListItemSelectProps } from '../../ListItem/BaseListItemSelect/BaseListItemSelect.types';
import BaseListItemSelect from '../../ListItem/BaseListItemSelect';

// Internal dependencies.
import { BaseListSelectProps } from './BaseListSelect.types';

const BaseListSelect: React.FC<BaseListSelectProps> = ({
  style,
  options,
  selectedOption,
  ...props
}) => {
  const [selectedItem, setSelectedItem] = useState<
    BaseListItemSelectProps | undefined
  >(selectedOption);

  const renderListItem = (option: BaseListItemSelectProps, index: number) => {
    const onPressHandler = (event: GestureResponderEvent) => {
      option.onPress?.(event);
      setSelectedItem(option);
    };
    return (
      <BaseListItemSelect
        {...option}
        key={index}
        onPress={onPressHandler}
        isSelected={option === selectedItem}
      />
    );
  };

  return (
    <BaseList {...props}>
      {options.map((option: BaseListItemSelectProps, index) =>
        renderListItem(option, index),
      )}
    </BaseList>
  );
};

export default BaseListSelect;
