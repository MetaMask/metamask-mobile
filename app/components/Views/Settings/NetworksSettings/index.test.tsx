import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';

const mockInitialState = {
  settings: {},
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
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
