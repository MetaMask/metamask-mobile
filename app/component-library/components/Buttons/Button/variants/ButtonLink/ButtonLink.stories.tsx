// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import { default as ButtonLinkComponent } from './ButtonLink';
import { SAMPLE_BUTTONLINK_PROPS } from './ButtonLink.constants';

const ButtonLinkMeta = {
  title: 'Component Library / Buttons',
  component: ButtonLinkComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BUTTONLINK_PROPS.label,
    },
    startIconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONLINK_PROPS.startIconName,
    },
    endIconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONLINK_PROPS.endIconName,
    },
    size: {
      options: ButtonSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONLINK_PROPS.size,
    },
    isDanger: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_BUTTONLINK_PROPS.isDanger,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_BUTTONLINK_PROPS.isDisabled,
    },
    width: {
      options: ButtonWidthTypes,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONLINK_PROPS.width,
    },
  },
};
export default ButtonLinkMeta;

export const ButtonLink = {};
