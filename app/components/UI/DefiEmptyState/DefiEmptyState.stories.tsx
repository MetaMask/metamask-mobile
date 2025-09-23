import { DefiEmptyState } from './DefiEmptyState';

const DefiEmptyStateMeta = {
  title: 'Components/UI/DefiEmptyState',
  component: DefiEmptyState,
};

export default DefiEmptyStateMeta;

// Default story
export const Default = {
  args: {
    onExploreDefi: () => {
      // eslint-disable-next-line no-console
      console.log('onExploreDefi');
    },
  },
};
