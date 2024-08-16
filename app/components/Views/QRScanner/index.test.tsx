import { renderScreen } from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';

const initialState = {
  engine: {
    backgroundState,
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
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
