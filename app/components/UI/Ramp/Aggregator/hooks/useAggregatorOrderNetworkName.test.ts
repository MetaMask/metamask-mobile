import { renderHook } from '@testing-library/react-hooks';
import { Order } from '@consensys/on-ramp-sdk';
import { CaipChainId } from '@metamask/utils';
import { useAggregatorOrderNetworkName } from './useAggregatorOrderNetworkName';

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

describe('useAggregatorOrderNetworkName', () => {
  it('returns shortName from order when available', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: '1',
          shortName: 'ETH',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBe('ETH');
  });

  it('falls back to network configuration name when shortName is not available', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: '1',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBe('Ethereum Mainnet');
  });

  it('handles decimal chain IDs by converting to CAIP format', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: '137',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBe('Polygon Mainnet');
  });

  it('handles hex chain IDs by converting to CAIP format', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: '0x1',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBe('Ethereum Mainnet');
  });

  it('handles CAIP chain IDs without conversion (Solana)', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBe('Solana Mainnet');
  });

  it('handles already CAIP-formatted EVM chain IDs', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: 'eip155:1',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBe('Ethereum Mainnet');
  });

  it('returns undefined when order is undefined', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName(undefined);

    expect(networkName).toBeUndefined();
  });

  it('returns undefined when order has no cryptoCurrency', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {} as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBeUndefined();
  });

  it('returns undefined when chainId is not found in configurations', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: '999',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBeUndefined();
  });

  it('prefers shortName over network configuration name', () => {
    const { result } = renderHook(() => useAggregatorOrderNetworkName());
    const getNetworkName = result.current;

    const order = {
      cryptoCurrency: {
        network: {
          chainId: 'eip155:1',
          shortName: 'ETH',
        },
      },
    } as Order;

    const networkName = getNetworkName(order);

    expect(networkName).toBe('ETH');
  });
});
