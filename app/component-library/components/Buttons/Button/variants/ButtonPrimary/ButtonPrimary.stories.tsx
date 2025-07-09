/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import { default as ButtonPrimaryComponent } from './ButtonPrimary';
import { SAMPLE_BUTTONPRIMARY_PROPS } from './ButtonPrimary.constants';

const handlePress = () => console.log('Button pressed');

const ButtonPrimaryMeta = {
  title: 'Component Library / Buttons',
  component: ButtonPrimaryComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BUTTONPRIMARY_PROPS.label,
    },
    startIconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONPRIMARY_PROPS.startIconName,
    },
    endIconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONPRIMARY_PROPS.endIconName,
    },
    size: {
      options: ButtonSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONPRIMARY_PROPS.size,
    },
    isDanger: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_BUTTONPRIMARY_PROPS.isDanger,
    },
    isInverse: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_BUTTONPRIMARY_PROPS.isDisabled,
    },
    width: {
      options: ButtonWidthTypes,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONPRIMARY_PROPS.width,
    },
  },
};
export default ButtonPrimaryMeta;

export const ButtonPrimary = {};

// Story demonstrating all four state combinations
export const AllStates = {
  render: () => (
    <>
      <ButtonPrimaryComponent label="Default Primary" onPress={handlePress} />
      <ButtonPrimaryComponent label="Danger" isDanger onPress={handlePress} />
      <ButtonPrimaryComponent label="Inverse" isInverse onPress={handlePress} />
      <ButtonPrimaryComponent
        label="Inverse Danger"
        isInverse
        isDanger
        onPress={handlePress}
      />
    </>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows all four state combinations: Default Primary, Danger, Inverse, and Inverse + Danger.',
      },
    },
  },
};

// Individual state stories
export const Default = {
  args: {
    label: 'Default Primary',
    onPress: handlePress,
  },
};

export const Danger = {
  args: {
    label: 'Danger',
    isDanger: true,
    onPress: handlePress,
  },
};

export const Inverse = {
  args: {
    label: 'Inverse',
    isInverse: true,
    onPress: handlePress,
  },
};

export const InverseDanger = {
  args: {
    label: 'Inverse Danger',
    isInverse: true,
    isDanger: true,
    onPress: handlePress,
  },
};

export const WithIcons = {
  args: {
    label: 'With Icons',
    startIconName: IconName.Bank,
    endIconName: IconName.ArrowRight,
    onPress: handlePress,
  },
};

export const Loading = {
  args: {
    label: 'Loading',
    loading: true,
    onPress: handlePress,
  },
};
