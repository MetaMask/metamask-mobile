/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import Icon from '../../../components/Icons/Icon/Icon';

// Internal dependencies.
import styleSheet from './BaseSelectButton.styles';
import { BaseSelectButtonProps } from './BaseSelectButton.types';
import BaseSelectableButton from '../../Selectable/BaseSelectableButton/BaseSelectableButton';
import {
  DEFAULT_BASESELECTBUTTON_SIZE,
  DEFAULT_BASESELECTBUTTON_CARETICON_ICONNAME,
  DEFAULT_BASESELECTBUTTON_CARETICON_ICONCOLOR,
  CARETICON_ICONSIZE_BY_SELECTBUTTONSIZE,
  BASESELECTBUTTON_TESTID,
} from './BaseSelectButton.constants';

const BaseSelectButton: React.FC<BaseSelectButtonProps> = ({
  style,
  size = DEFAULT_BASESELECTBUTTON_SIZE,
  isDisabled = false,
  isDanger = false,
  placeholder,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    isDisabled,
    isDanger,
  });

  return (
    <BaseSelectableButton
      style={styles.base}
      caretIconEl={
        <Icon
          name={DEFAULT_BASESELECTBUTTON_CARETICON_ICONNAME}
          color={DEFAULT_BASESELECTBUTTON_CARETICON_ICONCOLOR}
          size={CARETICON_ICONSIZE_BY_SELECTBUTTONSIZE[size]}
        />
      }
      isDisabled={isDisabled}
      isDanger={isDanger}
      testID={BASESELECTBUTTON_TESTID}
      {...props}
    />
  );
};

export default BaseSelectButton;
