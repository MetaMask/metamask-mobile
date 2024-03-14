import { renderScreen } from '../../../util/test/renderWithProvider';
import QrScanner from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

// create mock for react-native-camera
jest.mock('react-native-camera', () => {
  const reactNativeCamera = jest.requireActual('react-native-camera');

  return {
    ...reactNativeCamera,
    RNCamera: {
      Constants: {
        FlashMode: {
          auto: 'auto',
        },
        Type: {
          back: 'back',
        },
      },
    },
  };
});

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
