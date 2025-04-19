import { renderHook, act } from '@testing-library/react-hooks';
import { useAddNetwork } from './useAddNetwork';

jest.mock('@react-navigation/native', () => {
  const reactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...reactNavigation,
    useNavigation: jest.fn(),
  };
});

describe('useAddNetwork', () => {
  it('should pop up the network modal when adding a network', () => {
    const { result } = renderHook(() => useAddNetwork());
    act(() => {
      result.current.addPopularNetwork({
        chainId: '0x1',
        nickname: 'Ethereum',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_API_KEY',
        ticker: 'ETH',
        rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.io',
            imageUrl: 'https://etherscan.io/images/svg/brands/eth.svg',
            imageSource: 'https://etherscan.io/images/svg/brands/eth.svg',
        },
        failoverRpcUrls: [],
      });
    });
    expect(result.current.networkModal).toBeDefined();
  });
});
