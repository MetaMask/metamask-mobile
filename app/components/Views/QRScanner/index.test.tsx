import { renderScreen } from '../../../util/test/renderWithProvider';
import QrScanner from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

// create mock for react-native-permissions

describe('QrScanner', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      QrScanner,
      { name: 'QrScanner' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
