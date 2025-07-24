// Third party dependencies.
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

// Internal dependencies.
import ButtonHero from './ButtonHero';
import { SAMPLE_BUTTONHERO_PROPS } from './ButtonHero.constants';

const ButtonHeroMeta: Meta<typeof ButtonHero> = {
  title: 'Component Library / Buttons / ButtonHero',
  component: ButtonHero,
  parameters: {
    docs: {
      description: {
        component:
          'ButtonHero is a hero-style primary button with default and pressed states using primary colors.',
      },
    },
  },
  argTypes: {
    label: {
      control: { type: 'text' },
      description: 'The text or React node to display on the button',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Shows loading spinner when true',
    },
    isDisabled: {
      control: { type: 'boolean' },
      description: 'Disables the button when true',
    },
  },
};

export default ButtonHeroMeta;

const handlePress = () => {
  console.log('ButtonHero pressed!');
};

type Story = StoryObj<typeof ButtonHeroMeta>;

// Default story
export const Default: Story = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Hero Button',
    onPress: handlePress,
  },
};

// Loading state
export const Loading: Story = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Loading Button',
    loading: true,
    onPress: handlePress,
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Disabled Button',
    isDisabled: true,
    onPress: handlePress,
  },
};

// With icons
export const WithIcons: Story = {
  args: {
    ...SAMPLE_BUTTONHERO_PROPS,
    label: 'Get Started',
    startIconName: 'Add',
    endIconName: 'ArrowRight',
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
  parameters: {
    docs: {
      description: {
        story: 'Shows all three main states of ButtonHero: default, loading, and disabled.',
      },
    },
  },
};