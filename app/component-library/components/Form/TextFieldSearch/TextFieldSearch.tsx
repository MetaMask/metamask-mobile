/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';

// External dependencies.
import ButtonIcon, { ButtonIconSizes } from '../../Buttons/ButtonIcon';
import Icon, { IconName, IconSize } from '../../Icon';

// Internal dependencies.
import { TextFieldSearchProps } from './TextFieldSearch.types';

const TextFieldSearch: React.FC<TextFieldSearchProps> = ({
  showClearButton = false,
  clearButtonOnPress,
  clearButtonProps,
  value,
  ...props
}) => {
  const [currentValue, setCurrentValue] = useState(value);

  const searchIcon = <Icon name={IconName.SearchFilled} size={IconSize.Sm} />;

  const clearButtonHandler = useCallback(() => {
    setCurrentValue('');
    clearButtonOnPress?.();
  }, [setCurrentValue, clearButtonOnPress]);

  const clearButton = (
    <ButtonIcon
      size={ButtonIconSizes.Sm}
      iconName={IconName.CloseOutline}
      onPress={clearButtonHandler}
      {...clearButtonProps}
    />
  );
  return (
    <TextField
      value={currentValue}
      startAccessory={searchIcon}
      endAccessory={showClearButton && clearButton}
      {...props}
    />
  );
};

export default TextFieldSearch;
