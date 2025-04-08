/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import Button from '../../../components/Buttons/Button/foundation/ButtonBase';
import Text from '../../../components/Texts/Text/Text';
import { ButtonSize } from '../../../components/Buttons/Button';

// Internal dependencies.
import { ButtonToggleProps } from './ButtonToggle.types';
import styleSheet from './ButtonToggle.styles';
import {
  DEFAULT_BUTTONTOGGLE_LABEL_TEXTVARIANT,
  DEFAULT_BUTTONTOGGLE_LABEL_COLOR,
  DEFAULT_BUTTONTOGGLE_LABEL_COLOR_ACTIVE,
} from './ButtonToggle.constants';

const ButtonToggle = ({
  style,
  isActive = false,
  size = ButtonSize.Md,
  label,
  ...props
}: ButtonToggleProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    isActive,
    size,
  });

  const getLabelColor = () =>
    isActive
      ? DEFAULT_BUTTONTOGGLE_LABEL_COLOR_ACTIVE
      : DEFAULT_BUTTONTOGGLE_LABEL_COLOR;

  const renderLabel = () =>
    typeof label === 'string' ? (
      <Text
        variant={DEFAULT_BUTTONTOGGLE_LABEL_TEXTVARIANT}
        color={getLabelColor()}
      >
        {label}
      </Text>
    ) : (
      label
    );

  return (
    <Button
      style={styles.base}
      label={renderLabel()}
      labelColor={getLabelColor()}
      {...props}
    />
  );
};

export default ButtonToggle;
