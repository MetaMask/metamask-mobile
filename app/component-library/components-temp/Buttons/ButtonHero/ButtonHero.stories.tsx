// Third party dependencies.
import React from 'react';

// External dependencies.
import { IconName } from '../../../components/Icons/Icon';

// Internal dependencies.
import ButtonHero from './ButtonHero';
import { SAMPLE_BUTTONHERO_PROPS } from './ButtonHero.constants';

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

const handlePress = () => {
  console.log('ButtonHero pressed!');
};

// Default story
export const Default = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Hero Button',
    onPress: handlePress,
  },
};

// Loading state
export const Loading = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Loading Button',
    loading: true,
    onPress: handlePress,
  },
};

// Disabled state
export const Disabled = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Disabled Button',
    isDisabled: true,
    onPress: handlePress,
  },
};

// With icons
export const WithIcons = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Get Started',
    startIconName: IconName.Add,
    endIconName: IconName.ArrowRight,
    onPress: handlePress,
  },
};

// All states demonstration
export const AllStates = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Default Hero"
        onPress={handlePress}
      />
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="With Icons"
        startIconName={IconName.Bank}
        endIconName={IconName.ArrowRight}
        onPress={handlePress}
      />
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Loading Hero"
        loading
        onPress={handlePress}
      />
      <ButtonHero
        {...SAMPLE_BUTTONHERO_PROPS}
        label="Disabled Hero"
        isDisabled
        onPress={handlePress}
      />
    </div>
  ),
};
