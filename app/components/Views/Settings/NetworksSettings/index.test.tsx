import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
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
