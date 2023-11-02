/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import Text from '../../Texts/Text/Text';
import Avatar from '../../Avatars/Avatar';
import Icon from '../../Icons/Icon/Icon';

// Internal dependencies.
import styleSheet from './SelectButton.styles';
import { SelectButtonProps } from './SelectButton.types';
import SelectButtonBase from './foundation/SelectButtonBase';
import {
  DEFAULT_SELECTBUTTON_GAP,
  DEFAULT_SELECTBUTTON_VERTICALALIGNMENT,
  DEFAULT_SELECTBUTTON_SIZE,
  DEFAULT_SELECTBUTTON_TITLE_TEXTCOLOR,
  DEFAULT_SELECTBUTTON_TITLE_TEXTVARIANT,
  DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTCOLOR,
  DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTVARIANT,
  DEFAULT_SELECTBUTTON_CARETICON_ICONNAME,
  DEFAULT_SELECTBUTTON_CARETICON_ICONCOLOR,
  ICONSIZE_BY_SELECTBUTTONSIZE,
} from './SelectButton.constants';

const SelectButton: React.FC<SelectButtonProps> = ({
  style,
  size = DEFAULT_SELECTBUTTON_SIZE,
  iconEl,
  iconProps,
  title,
  description,
  children,
  startAccessory,
  endAccessory,
  gap = DEFAULT_SELECTBUTTON_GAP,
  verticalAlignment = DEFAULT_SELECTBUTTON_VERTICALALIGNMENT,
  isDisabled = false,
  isDanger = false,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    isDisabled,
    isDanger,
  });

  const renderTitle = () =>
    typeof title === 'string' ? (
      <Text
        variant={DEFAULT_SELECTBUTTON_TITLE_TEXTVARIANT}
        color={DEFAULT_SELECTBUTTON_TITLE_TEXTCOLOR}
      >
        {title}
      </Text>
    ) : (
      title
    );
  const renderDescription = () =>
    typeof description === 'string' ? (
      <Text
        variant={DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTVARIANT}
        color={DEFAULT_SELECTBUTTON_DESCRIPTION_TEXTCOLOR}
      >
        {description}
      </Text>
    ) : (
      description
    );

  const renderStartAccessory = () => {
    let accessory;
    if (startAccessory) {
      accessory = startAccessory;
    } else if (iconEl) {
      accessory = iconEl;
    } else if (iconProps) {
      accessory = <Avatar {...iconProps} />;
    }
    return accessory;
  };

  return (
    <SelectButtonBase
      style={styles.base}
      startAccessory={renderStartAccessory()}
      endAccessory={endAccessory}
      gap={gap}
      verticalAlignment={verticalAlignment}
      caretIcon={
        <Icon
          name={DEFAULT_SELECTBUTTON_CARETICON_ICONNAME}
          color={DEFAULT_SELECTBUTTON_CARETICON_ICONCOLOR}
          size={ICONSIZE_BY_SELECTBUTTONSIZE[size]}
        />
      }
      disabled={isDisabled}
      {...props}
    >
      {children || (
        <>
          {title && renderTitle()}
          {description && renderDescription()}
        </>
      )}
    </SelectButtonBase>
  );
};

export default SelectButton;
