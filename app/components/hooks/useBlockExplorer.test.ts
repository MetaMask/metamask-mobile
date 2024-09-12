import { NetworkController } from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { backgroundState } from '../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import useBlockExplorer from './useBlockExplorer';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        networkConfigurations: {
          linea_goerli: {
            chainId: '0xe704',
            id: 'linea_goerli',
            nickname: 'Linea Goerli',
            rpcPrefs: { blockExplorerUrl: 'https://goerli.lineascan.build' },
            rpcUrl: 'https://linea-goerli.infura.io/v3',
            ticker: 'LINEA',
          },
        },
        networksMetadata: {
          linea_goerli: {
            EIPS: { '1559': true },
            status: 'available',
          },
          mainnet: { EIPS: { '1559': true }, status: 'available' },
        },
        providerConfig: { chainId: '0x1', ticker: 'ETH', type: 'mainnet' },
        selectedNetworkClientId: 'linea_goerli',
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
  it('should navigate to the correct block explorer for no-RPC provider', () => {
    const { result } = renderHookWithProvider(() => useBlockExplorer());
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
    const { result } = renderHookWithProvider(() => useBlockExplorer());
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
