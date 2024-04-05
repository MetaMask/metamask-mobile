import { NetworkController } from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { LINEA_GOERLI, RPC } from '../../../app/constants/network';
import initialBackgroundState from '../../util/test/initial-background-state.json';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import useBlockExplorer from './useBlockExplorer';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      NetworkController: {
        providerConfig: {
          type: LINEA_GOERLI,
          rpcTarget: 'https://mainnet.infura.io/v3/1234567890abcdef',
        },
      } as unknown as NetworkController['state'],
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
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
            ...initialBackgroundState,
            NetworkController: {
              providerConfig: {
                type: RPC,
                rpcTarget: 'http://localhost/v3/',
              },
            } as NetworkController['state'],
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
