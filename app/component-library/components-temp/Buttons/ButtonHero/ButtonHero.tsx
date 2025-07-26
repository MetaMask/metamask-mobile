/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import ButtonBase from '../../../components/Buttons/Button/foundation/ButtonBase';
import { useTheme } from '../../../../util/theme';

// Internal dependencies.
import { ButtonHeroProps } from './ButtonHero.types';

const ButtonHero = ({
  label,
  startIconName,
  endIconName,
  isDisabled,
  loading,
  style,
  ...props
}: ButtonHeroProps) => {
  const { colors } = useTheme();

  const heroStyle = {
    backgroundColor: colors.icon.default,
    ...(typeof style === 'object' ? style : {}),
  };

  return (
    <ButtonBase
      label={label}
      startIconName={startIconName}
      endIconName={endIconName}
      isDisabled={isDisabled}
      loading={loading}
      labelColor={colors.primary.inverse}
      style={heroStyle}
      {...props}
    />
  );
};

export default ButtonHero;
