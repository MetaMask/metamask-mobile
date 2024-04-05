// Internal dependencies.
import { default as IconComponent } from './Icon';
import { SAMPLE_ICON_PROPS } from './Icon.constants';
import { IconColor, IconName, IconSize } from './Icon.types';

const IconMeta = {
  title: 'Component Library / Icons',
  component: IconComponent,
  argTypes: {
    name: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_ICON_PROPS.name,
    },
    size: {
      options: IconSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_ICON_PROPS.size,
    },
    color: {
      options: IconColor,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_ICON_PROPS.color,
    },
  },
};
export default IconMeta;

export const Icon = {};
