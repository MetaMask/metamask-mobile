import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { mainnetNetworkState } from '../../../../util/networks/constants';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mainnetNetworkState,
      },
    },
  },
};

jest.mock('../../../../store', () => ({
  store: {
    getState: () => mockInitialState,
  },
}));

describe('NetworksSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      NetworksSettings,
      { name: 'Network Settings' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
