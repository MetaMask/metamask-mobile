/* eslint-disable react/display-name */
// External dependencies.
import { IconName, IconColor } from '../../Icons/Icon';
import { AvatarSize } from '../../Avatars/Avatar';

// Internal dependencies.
import { default as TabBarItemComponent } from './TabBarItem';
import { SAMPLE_TABBARITEM_PROPS } from './TabBarItem.constants';

const TabBarItemMeta = {
  title: 'Component Library / Navigation',
  component: TabBarItemComponent,
  argTypes: {
    label: {
      control: { type: 'text' },
      defaultValue: SAMPLE_TABBARITEM_PROPS.label,
    },
    icon: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TABBARITEM_PROPS.icon,
    },
    iconSize: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TABBARITEM_PROPS.iconSize,
    },
    iconColor: {
      options: IconColor,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TABBARITEM_PROPS.iconColor,
    },
    iconBackgroundColor: {
      control: {
        type: 'color',
      },
      defaultValue: SAMPLE_TABBARITEM_PROPS.iconBackgroundColor,
    },
  },
};
export default TabBarItemMeta;

export const TabBarItem = {};
