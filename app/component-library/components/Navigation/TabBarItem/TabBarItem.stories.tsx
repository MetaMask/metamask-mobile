/* eslint-disable react/display-name */
// External dependencies.
import { IconName } from '../../Icons/Icon';

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
    iconName: {
      options: IconName,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_TABBARITEM_PROPS.iconName,
    },
    isActive: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TABBARITEM_PROPS.isActive,
    },
    isTradeButton: {
      control: { type: 'boolean' },
      defaultValue: SAMPLE_TABBARITEM_PROPS.isTradeButton,
    },
    labelText: {
      control: { type: 'text' },
    },
  },
};
export default TabBarItemMeta;

export const TabBarItem = {};
