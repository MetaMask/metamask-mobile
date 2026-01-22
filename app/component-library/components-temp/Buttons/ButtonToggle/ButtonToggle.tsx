/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import ButtonPrimary from '../../../components/Buttons/Button/variants/ButtonPrimary';
import ButtonSecondary from '../../../components/Buttons/Button/variants/ButtonSecondary';

// Internal dependencies.
import { ButtonToggleProps } from './ButtonToggle.types';

const ButtonToggle = ({ isActive = false, ...props }: ButtonToggleProps) =>
  isActive ? <ButtonPrimary {...props} /> : <ButtonSecondary {...props} />;

export default ButtonToggle;
