import { renderScreen } from '../../../util/test/renderWithProvider';
import QrScanner from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import Routes from '../../../constants/navigation/Routes';

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
      { name: Routes.QR_SCANNER },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
