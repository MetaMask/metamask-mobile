/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import Text from '../../Texts/Text/Text';
import Avatar from '../../Avatars/Avatar';

// Internal dependencies.
import styleSheet from './ValueListItem.styles';
import { ValueListItemProps } from './ValueListItem.types';
import ValueListItemBase from './foundation/ValueListItemBase';
import {
  DEFAULT_VALUELISTITEM_LABEL_TEXTCOLOR,
  DEFAULT_VALUELISTITEM_LABEL_TEXTVARIANT,
  DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTCOLOR,
  DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTVARIANT,
} from './ValueListItem.constants';

const ValueListItem: React.FC<ValueListItemProps> = ({
  style,
  iconEl,
  iconProps,
  label,
  description,
  children,
  startAccessory,
  endAccessory,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  const renderLabel = () =>
    typeof label === 'string' ? (
      <Text
        variant={DEFAULT_VALUELISTITEM_LABEL_TEXTVARIANT}
        color={DEFAULT_VALUELISTITEM_LABEL_TEXTCOLOR}
      >
        {label}
      </Text>
    ) : (
      label
    );
  const renderDescription = () =>
    typeof description === 'string' ? (
      <Text
        variant={DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTVARIANT}
        color={DEFAULT_VALUELISTITEM_DESCRIPTION_TEXTCOLOR}
        numberOfLines={1}
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
    <ValueListItemBase
      style={styles.base}
      startAccessory={renderStartAccessory()}
      endAccessory={endAccessory}
      {...props}
    >
      {children || (
        <>
          {label && renderLabel()}
          {description && renderDescription()}
        </>
      )}
    </ValueListItemBase>
  );
};

export default ValueListItem;
