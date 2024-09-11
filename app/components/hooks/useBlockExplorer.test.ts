import { NetworkController } from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { backgroundState } from '../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import useBlockExplorer from './useBlockExplorer';
import mockedEngine from '../../core/__mocks__/MockedEngine';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        networkConfigurations: {
          '35216af7-278b-4d68-b0b4-54e60fc52489': {
            chainId: '0xe704',
            id: '35216af7-278b-4d68-b0b4-54e60fc52489',
            nickname: 'Linea Goerli',
            rpcPrefs: { blockExplorerUrl: 'https://goerli.lineascan.build' },
            rpcUrl: 'https://linea-goerli.infura.io/v3',
            ticker: 'LINEA',
          },
        },
        networksMetadata: {
          '35216af7-278b-4d68-b0b4-54e60fc52489': {
            EIPS: { '1559': true },
            status: 'available',
          },
          mainnet: { EIPS: { '1559': true }, status: 'available' },
        },
        providerConfig: { chainId: '0x1', ticker: 'ETH', type: 'mainnet' },
        selectedNetworkClientId: '35216af7-278b-4d68-b0b4-54e60fc52489',
      } as unknown as NetworkController['state'],
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (fn: any) => fn(mockInitialState),
}));

const mockedGetNetworkClientById = jest.fn();

// Mock the Engine context and NetworkController
// jest.mock('../../core/Engine', () => ({
//   init: () => mockedEngine.init(),
//   context: {
//     NetworkController: {
//       getNetworkClientById: () => ({
//         configuration: {
//           chainId: '0xe704',
//           rpcUrl: 'https://linea-goerli.infura.io/v3',
//           ticker: 'LINEA',
//           type: 'custom',
//         },
//       }),
//     },
//   },
// }));

const mockedNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
  };
});

describe('useBlockExplorer', () => {
  beforeEach(() => {
    // Clear any previous mocks
    jest.clearAllMocks();
  });

  it('should navigate to the correct block explorer for no-RPC provider', () => {
    mockedGetNetworkClientById.mockReturnValue({
      configuration: { type: 'infura', chainId: '0x5' },
    });
    const { result } = renderHookWithProvider(() => useBlockExplorer(), {
      state: mockInitialState,
    });
    const { toBlockExplorer } = result.current;
    const address = '0x1234567890abcdef';
    toBlockExplorer(address);
    expect(useNavigation().navigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: `https://goerli.lineascan.build/address/${address}`,
      },
    });
  });

  it('should navigate to the correct block explorer for RPC provider', () => {
    const { result } = renderHookWithProvider(() => useBlockExplorer(), {
      state: {
        settings: {},
        engine: {
          backgroundState: {
            ...backgroundState,
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
                  rpcUrl: 'http://localhost/v3/',
                  chainId: '0xe708',
                  ticker: 'ETH',
                  nickname: 'Ethereum chain',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
          },
        },
      },
    });
    const { toBlockExplorer } = result.current;
    const address = '0x1234567890abcdef';
    toBlockExplorer(address);
    expect(useNavigation().navigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: `https://goerli.lineascan.build/address/${address}`,
      },
    });
  });
});
