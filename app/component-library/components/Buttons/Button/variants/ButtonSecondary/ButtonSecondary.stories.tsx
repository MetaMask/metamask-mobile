// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import { default as ButtonSecondaryComponent } from './ButtonSecondary';
import { SAMPLE_BUTTONSECONDARY_PROPS } from './ButtonSecondary.constants';

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
