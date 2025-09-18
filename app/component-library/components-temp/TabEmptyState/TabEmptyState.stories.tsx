import { TabEmptyState as TabEmptyStateComponent } from './TabEmptyState';

const TabEmptyStateMeta = {
  title: 'Components Temp / TabEmptyState',
  component: TabEmptyStateComponent,
  argTypes: {
    description: {
      control: { type: 'text' },
    },
    actionButtonText: {
      control: { type: 'text' },
    },
    icon: {
      control: { type: 'object' },
    },
  },
};

export default TabEmptyStateMeta;

// Basic story with description and action button
export const Default = {
  args: {
    description: 'No items found',
    actionButtonText: 'Add Item',
  },
};
