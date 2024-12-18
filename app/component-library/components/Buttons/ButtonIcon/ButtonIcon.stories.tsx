// External dependencies.
import { IconName, IconColor } from '../../Icons/Icon';

// Internal dependencies.
import { default as ButtonIconComponent } from './ButtonIcon';
import { SAMPLE_BUTTONICON_PROPS } from './ButtonIcon.constants';
import { ButtonIconSizes } from './ButtonIcon.types';

const ButtonIconMeta = {
  title: 'Component Library / Buttons',
  component: ButtonIconComponent,
  argTypes: {
    iconName: {
      options: IconName,
      control: {
        type: 'select',
      },
    },
    iconColor: {
      options: IconColor,
      control: {
        type: 'select',
      },
    },
    size: {
      options: ButtonIconSizes,
      control: {
        type: 'select',
      },
    },
    isDisabled: {
      control: { type: 'boolean' },
    },
  },
};
export default ButtonIconMeta;

export const ButtonIcon = {
  args: {
    iconName: SAMPLE_BUTTONICON_PROPS.iconName,
    iconColor: SAMPLE_BUTTONICON_PROPS.iconColor,
    size: SAMPLE_BUTTONICON_PROPS.size,
    isDisabled: SAMPLE_BUTTONICON_PROPS.isDisabled,
  },
};
