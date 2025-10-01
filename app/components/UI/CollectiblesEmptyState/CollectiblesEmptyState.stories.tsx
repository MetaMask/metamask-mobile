import { CollectiblesEmptyState as CollectiblesEmptyStateComponent } from './CollectiblesEmptyState';

const CollectiblesEmptyStateMeta = {
  title: 'Components / UI / CollectiblesEmptyState',
  component: CollectiblesEmptyStateComponent,
  argTypes: {
    onAction: { action: 'onAction' },
  },
};

export default CollectiblesEmptyStateMeta;

export const Default = {
  args: {
    onAcion: () => {
      // eslint-disable-next-line no-console
      console.log('onAction');
    },
  },
};
