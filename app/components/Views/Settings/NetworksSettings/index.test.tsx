import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';

const initialState = {
  engine: {
    backgroundState,
  },
};

jest.mock('../../../../core/Engine', () => ({
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
