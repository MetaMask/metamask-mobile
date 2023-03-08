/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';

// External dependencies.
import ButtonIcon from '../../Buttons/ButtonIcon';
import Icon from '../../Icons/Icon';
import TextField from '../TextField/TextField';

// Internal dependencies.
import { TextFieldSearchProps } from './TextFieldSearch.types';
import {
  TEXTFIELDSEARCH_TEST_ID,
  TOKEN_TEXTFIELDSEARCH_SEARCHICON_NAME,
  TOKEN_TEXTFIELDSEARCH_SEARCHICON_SIZE,
  TOKEN_TEXTFIELDSEARCH_CLOSEICON_NAME,
  TOKEN_TEXTFIELDSEARCH_CLOSEICON_SIZE,
} from './TextFieldSearch.constants';

const TextFieldSearch: React.FC<TextFieldSearchProps> = ({
  showClearButton = false,
  clearButtonOnPress,
  clearButtonProps,
  value,
  ...props
}) => {
  const [currentValue, setCurrentValue] = useState(value);

  const searchIcon = (
    <Icon
      name={TOKEN_TEXTFIELDSEARCH_SEARCHICON_NAME}
      size={TOKEN_TEXTFIELDSEARCH_SEARCHICON_SIZE}
    />
  );

  const clearButtonHandler = useCallback(() => {
    setCurrentValue('');
    clearButtonOnPress?.();
  }, [setCurrentValue, clearButtonOnPress]);

  const clearButton = (
    <ButtonIcon
      size={TOKEN_TEXTFIELDSEARCH_CLOSEICON_SIZE}
      iconName={TOKEN_TEXTFIELDSEARCH_CLOSEICON_NAME}
      onPress={clearButtonHandler}
      {...clearButtonProps}
    />
  );
  return (
    <TextField
      value={currentValue}
      startAccessory={searchIcon}
      endAccessory={showClearButton && clearButton}
      testID={TEXTFIELDSEARCH_TEST_ID}
      {...props}
    />
  );
};

export default TextFieldSearch;
