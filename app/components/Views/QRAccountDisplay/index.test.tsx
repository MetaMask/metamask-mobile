import QRAccountDisplay from './index';
import { renderScreen } from '../../../util/test/renderWithProvider';

import initialBackgroundState from '../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        identities: {
          '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045': {
            address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
            name: 'Account 1',
          },
        },
      },
    },
    NetworkController: {
      network: 1,
      providerConfig: {
        type: 'mainnet',
        chainId: '0x1',
        ticker: 'ETH',
      },
    },
  },
};

const TestWrapper = () => (
  // eslint-disable-next-line react/react-in-jsx-scope
  <QRAccountDisplay
    accountAddress={'0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'}
  />
);

describe('QRAccountDisplay', () => {
  it('renders correctly', () => {
    const { toJSON } = renderScreen(
      TestWrapper,
      { name: 'QRAccountDisplay' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
