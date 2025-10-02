import { PerpsEmptyState } from './PerpsEmptyState';

const PerpsEmptyStateMeta = {
  title: 'Components / UI / Perps / Views / PerpsEmptyState',
  component: PerpsEmptyState,
};

export default PerpsEmptyStateMeta;

export const Default = {
  args: {
    onAction: () => {
      // eslint-disable-next-line no-console
      console.log('Start Trading pressed');
    },
  },
};
