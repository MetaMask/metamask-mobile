import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';

// Mock the new utility functions
jest.mock('../../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  removeItemFromChainIdList: jest.fn().mockReturnValue({
    chain_id_list: ['eip155:1'],
  }),
}));

// Mock MetaMetrics
jest.mock('../../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      addTraitsToUser: jest.fn(),
    }),
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('NetworksSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      NetworksSettings,
      { name: 'Network Settings' },
      {
        state: initialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
