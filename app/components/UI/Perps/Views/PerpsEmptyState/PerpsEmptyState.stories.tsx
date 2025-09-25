import { PerpsEmptyState } from './PerpsEmptyState';

const PerpsEmptyStateMeta = {
  title: 'Components / UI / Perps / Views / PerpsEmptyState',
  component: PerpsEmptyState,
};

export default PerpsEmptyStateMeta;

// Default story
export const Default = {
  args: {
    onStartTrading: () => {
      // eslint-disable-next-line no-console
      console.log('Start Trading pressed');
    },
  },
};
