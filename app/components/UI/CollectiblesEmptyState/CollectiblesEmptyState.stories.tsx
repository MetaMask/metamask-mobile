import { CollectiblesEmptyState as CollectiblesEmptyStateComponent } from './CollectiblesEmptyState';

const CollectiblesEmptyStateMeta = {
  title: 'Components / UI / CollectiblesEmptyState',
  component: CollectiblesEmptyStateComponent,
  argTypes: {
    onDiscoverCollectibles: { action: 'onDiscoverCollectibles' },
  },
};

export default CollectiblesEmptyStateMeta;

export const Default = {
  args: {
    onDiscoverCollectibles: () => {
      // eslint-disable-next-line no-console
      console.log('onDiscoverCollectibles');
    },
  },
};
