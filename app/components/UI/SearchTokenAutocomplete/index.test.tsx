import { renderScreen } from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { FunctionComponent } from 'react';

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

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
};

describe('SearchTokenAutocomplete', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      SearchTokenAutocomplete as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
