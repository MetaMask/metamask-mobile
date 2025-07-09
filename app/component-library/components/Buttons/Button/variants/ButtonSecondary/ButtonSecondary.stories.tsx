/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import { default as ButtonSecondaryComponent } from './ButtonSecondary';
import { SAMPLE_BUTTONSECONDARY_PROPS } from './ButtonSecondary.constants';

const handlePress = () => console.log('Button pressed');

const ButtonSecondaryMeta = {
  title: 'Component Library / Buttons',
  component: ButtonSecondaryComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BUTTONSECONDARY_PROPS.label,
    },
    startIconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONSECONDARY_PROPS.startIconName,
    },
    endIconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONSECONDARY_PROPS.endIconName,
    },
    size: {
      options: ButtonSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONSECONDARY_PROPS.size,
    },
    isDanger: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_BUTTONSECONDARY_PROPS.isDanger,
    },
    isInverse: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_BUTTONSECONDARY_PROPS.isDisabled,
    },
    width: {
      options: ButtonWidthTypes,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONSECONDARY_PROPS.width,
    },
  },
};
export default ButtonSecondaryMeta;

export const ButtonSecondary = {};

// Story demonstrating all four state combinations
export const AllStates = {
  render: () => (
    <>
      <ButtonSecondaryComponent
        label="Default Secondary"
        onPress={handlePress}
      />
      <ButtonSecondaryComponent label="Danger" isDanger onPress={handlePress} />
      <ButtonSecondaryComponent
        label="Inverse"
        isInverse
        onPress={handlePress}
      />
      <ButtonSecondaryComponent
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
          'Shows all four state combinations: Default Secondary, Danger, Inverse, and Inverse + Danger.',
      },
    },
  },
};

// Individual state stories
export const Default = {
  args: {
    label: 'Default Secondary',
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
