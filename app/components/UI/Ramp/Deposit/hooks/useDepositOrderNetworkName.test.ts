import { renderHook } from '@testing-library/react-hooks';
import { DepositOrder } from '@consensys/native-ramps-sdk';
import { CaipChainId } from '@metamask/utils';
import { useDepositOrderNetworkName } from './useDepositOrderNetworkName';

const mockNetworkConfigurations: Record<CaipChainId, { name: string }> = {
  'eip155:1': {
    name: 'Ethereum Mainnet',
  },
  'eip155:137': {
    name: 'Polygon Mainnet',
  },
};

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockNetworkConfigurations),
}));

describe('useDepositOrderNetworkName', () => {
  it('returns network name from deposit order when available', () => {
    const { result } = renderHook(() => useDepositOrderNetworkName());
    const getNetworkName = result.current;

    const depositOrder = {
      network: {
        chainId: 'eip155:1',
        name: 'Ethereum',
      },
    } as DepositOrder;

    const networkName = getNetworkName(depositOrder);

    expect(networkName).toBe('Ethereum');
  });

  it('falls back to network configuration name when deposit order name is not available', () => {
    const { result } = renderHook(() => useDepositOrderNetworkName());
    const getNetworkName = result.current;

    const depositOrder = {
      network: {
        chainId: 'eip155:137',
      },
    } as DepositOrder;

    const networkName = getNetworkName(depositOrder);

    expect(networkName).toBe('Polygon Mainnet');
  });

  it('returns Unknown Network when network is not in configurations', () => {
    const { result } = renderHook(() => useDepositOrderNetworkName());
    const getNetworkName = result.current;

    const depositOrder = {
      network: {
        chainId: 'eip155:999',
      },
    } as DepositOrder;

    const networkName = getNetworkName(depositOrder);

    expect(networkName).toBe('Unknown Network');
  });

  it('returns Unknown Network when deposit order is undefined', () => {
    const { result } = renderHook(() => useDepositOrderNetworkName());
    const getNetworkName = result.current;

    const networkName = getNetworkName(undefined);

    expect(networkName).toBe('Unknown Network');
  });

  it('returns Unknown Network when deposit order has no network', () => {
    const { result } = renderHook(() => useDepositOrderNetworkName());
    const getNetworkName = result.current;

    const depositOrder = {} as DepositOrder;

    const networkName = getNetworkName(depositOrder);

    expect(networkName).toBe('Unknown Network');
  });

  it('prefers deposit order name over network configuration name', () => {
    const { result } = renderHook(() => useDepositOrderNetworkName());
    const getNetworkName = result.current;

    const depositOrder = {
      network: {
        chainId: 'eip155:1',
        name: 'Ethereum',
      },
    } as DepositOrder;

    const networkName = getNetworkName(depositOrder);

    expect(networkName).toBe('Ethereum');
  });
});
