/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback } from 'react';

// External dependencies.
import ButtonIcon from '../../Buttons/ButtonIcon';
import Icon, { IconColor } from '../../Icons/Icon';
import TextField from '../TextField/TextField';

// Internal dependencies.
import { TextFieldSearchProps } from './TextFieldSearch.types';
import {
  TEXTFIELDSEARCH_TEST_ID,
  DEFAULT_TEXTFIELDSEARCH_SEARCHICON_NAME,
  DEFAULT_TEXTFIELDSEARCH_SEARCHICON_SIZE,
  DEFAULT_TEXTFIELDSEARCH_CLOSEICON_NAME,
  DEFAULT_TEXTFIELDSEARCH_CLOSEICON_SIZE,
} from './TextFieldSearch.constants';

const TextFieldSearch: React.FC<TextFieldSearchProps> = ({
  showClearButton = false,
  onPressClearButton,
  clearButtonProps,
  value,
  ...props
}) => {
  const searchIcon = (
    <Icon
      name={DEFAULT_TEXTFIELDSEARCH_SEARCHICON_NAME}
      size={DEFAULT_TEXTFIELDSEARCH_SEARCHICON_SIZE}
      color={IconColor.Alternative}
    />
  );

  const clearButtonHandler = useCallback(() => {
    onPressClearButton?.();
  }, [onPressClearButton]);

  const clearButton = (
    <ButtonIcon
      size={DEFAULT_TEXTFIELDSEARCH_CLOSEICON_SIZE}
      iconName={DEFAULT_TEXTFIELDSEARCH_CLOSEICON_NAME}
      onPress={clearButtonHandler}
      {...clearButtonProps}
    />
  );
  return (
    <TextField
      value={value}
      startAccessory={searchIcon}
      endAccessory={showClearButton && clearButton}
      testID={TEXTFIELDSEARCH_TEST_ID}
      {...props}
    />
  );
};

export default TextFieldSearch;
