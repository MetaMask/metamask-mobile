// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import { default as ButtonPrimaryComponent } from './ButtonPrimary';
import { SAMPLE_BUTTONPRIMARY_PROPS } from './ButtonPrimary.constants';

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
