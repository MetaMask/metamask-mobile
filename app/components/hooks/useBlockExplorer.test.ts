import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { backgroundState } from '../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import useBlockExplorer from './useBlockExplorer';
import { mockNetworkState } from '../../util/test/network';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: '0xe704',
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          blockExplorerUrl: 'https://goerli.lineascan.build',
        }),
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

  describe('Popular networks support', () => {
    const testCases = [
      {
        network: 'Polygon',
        chainId: '0x89',
        expectedUrl: 'https://polygonscan.com/address/0x1234567890abcdef',
        expectedName: 'Polygonscan',
      },
      {
        network: 'Arbitrum',
        chainId: '0xa4b1',
        expectedUrl: 'https://arbiscan.io/address/0x1234567890abcdef',
        expectedName: 'Arbiscan',
      },
      {
        network: 'BNB Chain',
        chainId: '0x38',
        expectedUrl: 'https://bscscan.com/address/0x1234567890abcdef',
        expectedName: 'Bscscan',
      },
      {
        network: 'Avalanche',
        chainId: '0xa86a',
        expectedUrl: 'https://snowtrace.io/address/0x1234567890abcdef',
        expectedName: 'Snowtrace',
      },
      {
        network: 'Optimism',
        chainId: '0xa',
        expectedUrl:
          'https://optimistic.etherscan.io/address/0x1234567890abcdef',
        expectedName: 'Optimistic',
      },
    ] as const;

    it.each(testCases)(
      'should return correct block explorer URL for $network',
      ({ chainId, expectedUrl }) => {
        const { result } = renderHookWithProvider(() => useBlockExplorer());
        const { getBlockExplorerUrl } = result.current;
        const address = '0x1234567890abcdef';

        const url = getBlockExplorerUrl(address, chainId);

        expect(url).toBe(expectedUrl);
      },
    );

    it.each(testCases)(
      'should return correct block explorer name for $network',
      ({ chainId, expectedName }) => {
        const { result } = renderHookWithProvider(() => useBlockExplorer());
        const { getBlockExplorerName } = result.current;

        const name = getBlockExplorerName(chainId);

        expect(name).toBe(expectedName);
      },
    );
  });
});
