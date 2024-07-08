import { renderScreen } from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';

const initialState = {
  engine: {
    backgroundState,
  },
};

// create mock for react-native-permissions

describe('QrScanner', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      QrScanner,
      { name: Routes.QR_TAB_SWITCHER },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
