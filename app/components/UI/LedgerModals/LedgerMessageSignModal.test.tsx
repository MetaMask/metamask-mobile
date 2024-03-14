import { renderScreen } from '../../../util/test/renderWithProvider';
import LedgerMessageSignModal from './LedgerMessageSignModal';
import { RPCStageTypes } from '../../../reducers/rpcEvents';

jest.mock('react-native-device-info', () => ({
  getSystemVersion: () => 'some version',
}));

jest.mock('react-native-permissions', () => ({
  request: () => 'something',
  check: jest.fn().mockRejectedValue('granted'),
  checkMultiple: jest.fn().mockRejectedValue({
    'android.permission.ACCESS_FINE_LOCATION': 'granted',
    'android.permission.BLUETOOTH_SCAN': 'granted',
    'android.permission.BLUETOOTH_CONNECT': 'granted',
  }),
  RESULTS: {
    GRANTED: 'granted',
  },
  PERMISSIONS: {
    IOS: {
      BLUETOOTH_PERIPHERAL: 'ios.permission.BLUETOOTH_PERIPHERAL',
    },
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
    },
  },
  openSettings: jest.fn(),
}));

const initialState = {
  rpcEvents: { signingEvent: RPCStageTypes.IDLE },
};

describe('LedgerMessageSignModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      LedgerMessageSignModal,
      { name: 'LederMessageSignModal' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
