// Third party dependencies.
import React from 'react';

// External dependencies.
import { IconName } from '../../../components/Icons/Icon';

// Internal dependencies.
import ButtonHero from './ButtonHero';

const ButtonHeroMeta = {
  title: 'Components-Temp / Buttons',
  component: ButtonHero,
  argTypes: {
    label: {
      control: { type: 'text' },
    },
    loading: {
      control: { type: 'boolean' },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
    startIconName: {
      control: { type: 'select' },
      options: Object.values(IconName),
    },
    endIconName: {
      control: { type: 'select' },
      options: Object.values(IconName),
    },
  },
};

export default ButtonHeroMeta;

export const Default = {
  args: {
    label: 'Hero Button',
    onPress: () => console.log('Hero Button pressed'),
  },
};

export const WithIcons = {
  args: {
    label: 'With Icons',
    startIconName: IconName.Add,
    endIconName: IconName.ArrowRight,
    onPress: () => console.log('With Icons pressed'),
  },
};

export const Loading = {
  args: {
    label: 'Loading Button',
    loading: true,
    onPress: () => console.log('Loading button pressed'),
  },
};

export const Disabled = {
  args: {
    label: 'Disabled Button',
    isDisabled: true,
    onPress: () => console.log('Disabled button pressed'),
  },
};
