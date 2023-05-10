/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { getButtonBaseStoryProps } from '../../foundation/ButtonBase/ButtonBase.stories';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';
import { ButtonPrimaryProps } from './ButtonPrimary.types';

export const getButtonPrimaryStoryProps = (): ButtonPrimaryProps =>
  getButtonBaseStoryProps();

const ButtonPrimaryStory = () => (
  <ButtonPrimary {...getButtonPrimaryStoryProps()} />
);

export default ButtonPrimaryStory;
