import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { backgroundState } from '../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import useBlockExplorer from './useBlockExplorer';
import { lineaGoerliNetworkState } from '../../util/networks/constants';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...lineaGoerliNetworkState,
      },
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
