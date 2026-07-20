import { renderHook } from '@testing-library/react-hooks';
import { CaipChainId } from '@metamask/utils';
import { useDepositCryptoCurrencyNetworkName } from './useDepositCryptoCurrencyNetworkName';

const mockNetworkConfigurations: Record<CaipChainId, { name: string }> = {
  'eip155:1': {
    name: 'Ethereum Mainnet',
  },
  'eip155:137': {
    name: 'Polygon Mainnet',
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    name: 'Solana Mainnet',
  },
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockNetworkConfigurations),
}));

describe('useDepositCryptoCurrencyNetworkName', () => {
  it('returns network name from configurations when chainId is found', () => {
    const { result } = renderHook(() => useDepositCryptoCurrencyNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName('eip155:1');

    expect(networkName).toBe('Ethereum Mainnet');
  });

  it('returns network name for Polygon', () => {
    const { result } = renderHook(() => useDepositCryptoCurrencyNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName('eip155:137');

    expect(networkName).toBe('Polygon Mainnet');
  });

  it('returns network name for Solana', () => {
    const { result } = renderHook(() => useDepositCryptoCurrencyNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );

    expect(networkName).toBe('Solana Mainnet');
  });

  it('returns chainId when network is not in configurations', () => {
    const { result } = renderHook(() => useDepositCryptoCurrencyNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName('eip155:999');

    expect(networkName).toBe('eip155:999');
  });

  it('returns "Unknown Network" when chainId is undefined', () => {
    const { result } = renderHook(() => useDepositCryptoCurrencyNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName(undefined);

    expect(networkName).toBe('Unknown Network');
  });

  it('returns "Unknown Network" when chainId is empty string', () => {
    const { result } = renderHook(() => useDepositCryptoCurrencyNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName('');

    expect(networkName).toBe('Unknown Network');
  });
});
