/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { getButtonBaseStoryProps } from '../../foundation/ButtonBase/ButtonBase.stories';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryProps } from './ButtonSecondary.types';

export const getButtonSecondaryStoryProps = (): ButtonSecondaryProps =>
  getButtonBaseStoryProps();

const ButtonSecondaryStory = () => (
  <ButtonSecondary {...getButtonSecondaryStoryProps()} />
);

export default ButtonSecondaryStory;
