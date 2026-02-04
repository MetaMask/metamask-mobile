/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback } from 'react';

// External dependencies.
import ButtonIcon, { ButtonIconSizes } from '../../Buttons/ButtonIcon';
import Icon, { IconName, IconSize, IconColor } from '../../Icons/Icon';
import TextField from '../TextField/TextField';

// Internal dependencies.
import { TextFieldSearchProps } from './TextFieldSearch.types';
import { TEXTFIELDSEARCH_TEST_ID } from './TextFieldSearch.constants';
import styles from './TextFieldSearch.styles';

const TextFieldSearch: React.FC<TextFieldSearchProps> = ({
  showClearButton = false,
  onPressClearButton,
  clearButtonProps,
  value,
  style,
  ...props
}) => {
  const searchIcon = (
    <Icon
      name={IconName.Search}
      size={IconSize.Md}
      color={IconColor.Alternative}
    />
  );

  const clearButtonHandler = useCallback(() => {
    onPressClearButton?.();
  }, [onPressClearButton]);

  const clearButton = (
    <ButtonIcon
      size={ButtonIconSizes.Md}
      iconName={IconName.CircleX}
      iconColor={IconColor.Alternative}
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
      style={[style, styles.base]}
      {...props}
    />
  );
};

export default TextFieldSearch;
