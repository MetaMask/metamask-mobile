/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Icon from '../../../../Icons/Icon/Icon';
import Avatar from '../../../../Avatars/Avatar/Avatar';
import SelectableButton from '../../../foundation/SelectableButton/SelectableButton';

// Internal dependencies.
import styleSheet from './DropdownButton.styles';
import { DropdownButtonProps } from './DropdownButton.types';
import {
  DEFAULT_DROPDOWNBUTTON_GAP,
  DEFAULT_DROPDOWNBUTTON_VERTICALALIGNMENT,
  DEFAULT_DROPDOWNBUTTON_SIZE,
  DEFAULT_DROPDOWNBUTTON_CARETICON_ICONNAME,
  DEFAULT_DROPDOWNBUTTON_CARETICON_ICONCOLOR,
  CARETICON_ICONSIZE_BY_DROPDOWNBUTTONSIZE,
  STARTICON_ICONSIZE_BY_DROPDOWNBUTTONSIZE,
  DROPDOWNBUTTON_TESTID,
} from './DropdownButton.constants';

const DropdownButton: React.FC<DropdownButtonProps> = ({
  style,
  size = DEFAULT_DROPDOWNBUTTON_SIZE,
  gap = DEFAULT_DROPDOWNBUTTON_GAP,
  verticalAlignment = DEFAULT_DROPDOWNBUTTON_VERTICALALIGNMENT,
  isDisabled = false,
  isDanger = false,
  startAccessory,
  iconEl,
  iconProps,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    isDisabled,
    isDanger,
  });
  const renderStartAccessory = () => {
    let accessory;
    if (startAccessory) {
      accessory = startAccessory;
    } else if (iconEl) {
      accessory = React.cloneElement(iconEl, {
        ...iconEl.props,
        size: STARTICON_ICONSIZE_BY_DROPDOWNBUTTONSIZE[size],
      });
    } else if (iconProps) {
      accessory = (
        <Avatar
          size={STARTICON_ICONSIZE_BY_DROPDOWNBUTTONSIZE[size]}
          {...iconProps}
        />
      );
    }
    return accessory;
  };

  return (
    <SelectableButton
      style={styles.base}
      gap={gap}
      verticalAlignment={verticalAlignment}
      caretIconEl={
        <Icon
          name={DEFAULT_DROPDOWNBUTTON_CARETICON_ICONNAME}
          color={DEFAULT_DROPDOWNBUTTON_CARETICON_ICONCOLOR}
          size={CARETICON_ICONSIZE_BY_DROPDOWNBUTTONSIZE[size]}
        />
      }
      disabled={isDisabled}
      startAccessory={renderStartAccessory()}
      testID={DROPDOWNBUTTON_TESTID}
      {...props}
    />
  );
};

export default DropdownButton;
