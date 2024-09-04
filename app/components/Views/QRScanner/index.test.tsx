import { renderScreen } from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import mockedEngine from '../../../core/__mocks__/MockedEngine';

const initialState = {
  engine: {
    backgroundState,
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

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
