import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNftRefresh } from './useNftRefresh';
import Engine from '../../../core/Engine';
import { useNftDetection } from '../../hooks/useNftDetection';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../selectors/preferencesController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      checkAndUpdateAllNftsOwnershipStatus: jest.fn(),
    },
  },
}));

jest.mock('../../hooks/useNftDetection', () => ({
  useNftDetection: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': {
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [{ networkClientId: 'mainnet-client' }],
    },
    '0x89': {
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [{ networkClientId: 'polygon-client' }],
    },
  })),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectTokenNetworkFilter: jest.fn(() => ({
    '0x1': true,
    '0x89': true,
  })),
}));

describe('useNftRefresh', () => {
  const mockDetectNfts = jest.fn();
  const mockCheckAndUpdateAllNftsOwnershipStatus = jest.fn();

  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseNftDetection = useNftDetection as jest.MockedFunction<
    typeof useNftDetection
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDetectNfts.mockResolvedValue(undefined);
    mockCheckAndUpdateAllNftsOwnershipStatus.mockResolvedValue(undefined);

    mockUseNftDetection.mockReturnValue({
      detectNfts: mockDetectNfts,
      chainIdsToDetectNftsFor: ['0x1', '0x89'],
      abortDetection: jest.fn(),
    });

    (
      Engine.context.NftController
        .checkAndUpdateAllNftsOwnershipStatus as jest.Mock
    ).mockImplementation(mockCheckAndUpdateAllNftsOwnershipStatus);

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return {
          '0x1': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: 'mainnet-client' }],
          },
          '0x89': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: 'polygon-client' }],
          },
        };
      }
      if (selector === selectTokenNetworkFilter) {
        return {
          '0x1': true,
          '0x89': true,
        };
      }
      return undefined;
    });
  });

  it('returns refreshing and onRefresh', () => {
    const { result } = renderHook(() => useNftRefresh());

    expect(result.current.refreshing).toBe(false);
    expect(result.current.onRefresh).toBeDefined();
    expect(typeof result.current.onRefresh).toBe('function');
  });

  it('sets refreshing to true during refresh and false after', async () => {
    const { result } = renderHook(() => useNftRefresh());

    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('calls useNftDetection.detectNfts on refresh', async () => {
    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockDetectNfts).toHaveBeenCalledTimes(1);
  });

  it('calls NftController.checkAndUpdateAllNftsOwnershipStatus for each network', async () => {
    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockCheckAndUpdateAllNftsOwnershipStatus).toHaveBeenCalledWith(
      'mainnet-client',
    );
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).toHaveBeenCalledWith(
      'polygon-client',
    );
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).toHaveBeenCalledTimes(2);
  });

  it('handles errors gracefully and sets refreshing to false', async () => {
    const mockError = new Error('Detection failed');
    mockDetectNfts.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('does not call checkAndUpdateAllNftsOwnershipStatus when no network client IDs', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenNetworkFilter) {
        return {};
      }
      return undefined;
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockDetectNfts).toHaveBeenCalled();
    expect(mockCheckAndUpdateAllNftsOwnershipStatus).not.toHaveBeenCalled();
  });

  it('skips network client IDs that are undefined', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return {
          '0x1': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: undefined }],
          },
        };
      }
      if (selector === selectTokenNetworkFilter) {
        return { '0x1': true };
      }
      return undefined;
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockCheckAndUpdateAllNftsOwnershipStatus).not.toHaveBeenCalled();
  });

  it('runs detectNfts and ownership status checks in parallel', async () => {
    const callOrder: string[] = [];

    mockDetectNfts.mockImplementation(async () => {
      callOrder.push('detectNfts-start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push('detectNfts-end');
    });

    mockCheckAndUpdateAllNftsOwnershipStatus.mockImplementation(async () => {
      callOrder.push('ownership-start');
      await new Promise((resolve) => setTimeout(resolve, 5));
      callOrder.push('ownership-end');
    });

    const { result } = renderHook(() => useNftRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(callOrder[0]).toBe('detectNfts-start');
    expect(callOrder[1]).toBe('ownership-start');
  });
});
