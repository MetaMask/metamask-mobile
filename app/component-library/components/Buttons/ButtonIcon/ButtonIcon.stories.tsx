// External dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies.
import { default as ButtonIconComponent } from './ButtonIcon';
import { SAMPLE_BUTTONICON_PROPS } from './ButtonIcon.constants';
import { ButtonIconSizes, ButtonIconVariants } from './ButtonIcon.types';

const ButtonIconMeta = {
  title: 'Component Library / Buttons',
  component: ButtonIconComponent,
  argTypes: {
    iconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONICON_PROPS.iconName,
    },
    variant: {
      options: ButtonIconVariants,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONICON_PROPS.variant,
    },
    size: {
      options: ButtonIconSizes,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BUTTONICON_PROPS.size,
    },
    isDisabled: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_BUTTONICON_PROPS.isDisabled,
    },
  },
};
export default ButtonIconMeta;

export const ButtonIcon = {};
