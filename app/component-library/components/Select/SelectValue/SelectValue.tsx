/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import Text from '../../Texts/Text/Text';
import Avatar from '../../Avatars/Avatar';

// Internal dependencies.
import styleSheet from './SelectValue.styles';
import { SelectValueProps } from './SelectValue.types';
import SelectValueBase from './foundation/SelectValueBase';
import {
  DEFAULT_SELECTVALUE_TITLE_TEXTCOLOR,
  DEFAULT_SELECTVALUE_TITLE_TEXTVARIANT,
  DEFAULT_SELECTVALUE_DESCRIPTION_TEXTCOLOR,
  DEFAULT_SELECTVALUE_DESCRIPTION_TEXTVARIANT,
} from './SelectValue.constants';

const SelectValue: React.FC<SelectValueProps> = ({
  style,
  iconEl,
  iconProps,
  title,
  description,
  children,
  startAccessory,
  endAccessory,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  const renderTitle = () =>
    typeof title === 'string' ? (
      <Text
        variant={DEFAULT_SELECTVALUE_TITLE_TEXTVARIANT}
        color={DEFAULT_SELECTVALUE_TITLE_TEXTCOLOR}
      >
        {title}
      </Text>
    ) : (
      title
    );
  const renderDescription = () =>
    typeof description === 'string' ? (
      <Text
        variant={DEFAULT_SELECTVALUE_DESCRIPTION_TEXTVARIANT}
        color={DEFAULT_SELECTVALUE_DESCRIPTION_TEXTCOLOR}
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
    <SelectValueBase
      style={styles.base}
      startAccessory={renderStartAccessory()}
      endAccessory={endAccessory}
      {...props}
    >
      {children || (
        <>
          {title && renderTitle()}
          {description && renderDescription()}
        </>
      )}
    </SelectValueBase>
  );
};

export default SelectValue;
