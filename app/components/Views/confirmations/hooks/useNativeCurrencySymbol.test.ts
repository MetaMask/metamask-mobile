import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { useNativeCurrencySymbol } from './useNativeCurrencySymbol';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const renderWithMock = ({
  chainId,
  mockGetAllMultichainNetworkConfigurations = {
    '0x1': { nativeCurrency: 'FOO' },
    '0x2': { nativeCurrency: 'BAR' },
    '0x1079': { nativeCurrency: 'USD' }, // Tempo Mainnet
    '0xa5bf': { nativeCurrency: 'USD' }, // Tempo Testnet Moderato
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': { nativeCurrency: 'MEME' },
  },
}: {
  chainId?: Hex | CaipChainId;
  mockGetAllMultichainNetworkConfigurations?: {
    [key: string]: { nativeCurrency: string };
  };
}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectNetworkConfigurations) {
      return mockGetAllMultichainNetworkConfigurations;
    }
  });
  return renderHook(() => useNativeCurrencySymbol(chainId));
};

describe('useNativeCurrencySymbol', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns FOO when network is found in map using hex chainId', () => {
    const { result } = renderWithMock({ chainId: '0x1' });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'FOO' });
  });

  it('returns BAR when network is found in map using hex chainId', () => {
    const { result } = renderWithMock({ chainId: '0x2' });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'BAR' });
  });

  it('returns ETH when network is missing from map hex chainId', () => {
    const { result } = renderWithMock({ chainId: '0x3' });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'ETH' });
  });

  it('returns MEME when network is found in map using CAIP chainId', () => {
    const { result } = renderWithMock({
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'MEME' });
  });

  it('returns ETH when network is missing from map using CAIP chainId', () => {
    const { result } = renderWithMock({ chainId: 'eip155:3' });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'ETH' });
  });

  it('returns ETH when chainId is undefined', () => {
    const { result } = renderWithMock({ chainId: undefined });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'ETH' });
  });

  it('returns pathUSD when chainId is Hex Tempo Mainnet chainId', () => {
    const { result } = renderWithMock({ chainId: '0x1079' });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'pathUSD' });
  });

  it('returns pathUSD when chainId is Hex Tempo Testnet chainId', () => {
    const { result } = renderWithMock({ chainId: '0xa5bf' });
    expect(result.current).toEqual({ nativeCurrencySymbol: 'pathUSD' });
  });
});
