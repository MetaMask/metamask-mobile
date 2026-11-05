import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { usePredictAccountState } from './usePredictAccountState';
import { predictAccountStateKeys } from '../queries/accountState';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getAccountState: jest.fn(),
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x89': { name: 'Polygon' },
        },
      },
      addNetwork: jest.fn(),
    },
    NetworkEnablementController: {
      enableNetwork: jest.fn(),
      enableNetworkInNamespace: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../core/redux', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock(
  '../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(() => true),
  }),
);

jest.mock('../utils/predictErrorHandler', () => {
  const actual = jest.requireActual('../utils/predictErrorHandler');
  return {
    ensureError: actual.ensureError,
  };
});

const mockGetAccountState = Engine.context.PredictController
  .getAccountState as jest.Mock;

const mockEnableNetwork = Engine.context.NetworkEnablementController
  .enableNetwork as jest.Mock;

const mockEnableNetworkInNamespace = Engine.context.NetworkEnablementController
  .enableNetworkInNamespace as jest.Mock;

const networkController = Engine.context.NetworkController as unknown as {
  state: {
    networkConfigurationsByChainId: Record<string, { name?: string }>;
  };
  addNetwork: jest.Mock;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('usePredictAccountState', () => {
  const mockAccountState = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isDeployed: true,
    walletType: 'safe' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccountState.mockResolvedValue(mockAccountState);
    networkController.state.networkConfigurationsByChainId = {
      '0x89': { name: 'Polygon' },
    };
    networkController.addNetwork.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('loads account state on mount by default', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({});
      expect(result.current.data?.address).toEqual(mockAccountState.address);
    });

    it('does not load account state when enabled is false', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ enabled: false }),
        { wrapper: Wrapper },
      );

      // Wait a bit to ensure it doesn't load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('data fetching', () => {
    it('returns account state data on success', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({});
      expect(result.current.data?.address).toEqual(mockAccountState.address);
      expect(result.current.data?.isDeployed).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('exposes error when loading fails', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockRejectedValue(
        new Error('Failed to load account state'),
      );

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe(
        'Failed to load account state',
      );
      expect(result.current.data).toBeUndefined();
    });

    it('clears error on successful refetch', async () => {
      const { Wrapper, queryClient } = createWrapper();
      mockGetAccountState.mockRejectedValue(new Error('First error'));

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error?.message).toBe('First error');
      });

      // Switch to success for the refetch
      mockGetAccountState.mockResolvedValue(mockAccountState);

      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: predictAccountStateKeys.all(),
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data?.address).toEqual(mockAccountState.address);
      });
    });
  });

  describe('error logging', () => {
    it('logs error via Logger.error when query fails', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockRejectedValue(
        new Error('Failed to load account state'),
      );

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'Predict',
            component: 'usePredictAccountState',
          }),
        }),
      );
    });
  });

  describe('account state values', () => {
    it('returns isDeployed as false when account is not deployed', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockResolvedValue({
        ...mockAccountState,
        isDeployed: false,
      });

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.isDeployed).toBe(false);
    });

    it('has undefined data when query is disabled', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ enabled: false }),
        { wrapper: Wrapper },
      );

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('query invalidation', () => {
    it('refetches when refetch is called', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.address).toBe(mockAccountState.address);
      expect(mockGetAccountState).toHaveBeenCalledTimes(1);

      const updatedState = {
        ...mockAccountState,
        address: '0x9876543210987654321098765432109876543210',
      };
      mockGetAccountState.mockResolvedValue(updatedState);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetAccountState).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(result.current.data?.address).toBe(updatedState.address);
      });
    });
  });

  describe('polygon network enablement', () => {
    it('leaves network enablement unchanged when Polygon is already configured', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({});
      expect(networkController.addNetwork).not.toHaveBeenCalled();
      expect(mockEnableNetwork).not.toHaveBeenCalled();
      expect(mockEnableNetworkInNamespace).not.toHaveBeenCalled();
    });

    it('adds Polygon without changing network enablement when Polygon is missing', async () => {
      networkController.state.networkConfigurationsByChainId = {};
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data?.address).toEqual(mockAccountState.address);
      });

      expect(networkController.addNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: '0x89',
          name: 'Polygon',
          nativeCurrency: 'POL',
        }),
      );
      expect(mockEnableNetwork).not.toHaveBeenCalled();
      expect(mockEnableNetworkInNamespace).not.toHaveBeenCalled();
      expect(mockGetAccountState).toHaveBeenCalledWith({});
    });

    it('leaves network enablement unchanged when adding Polygon fails', async () => {
      networkController.state.networkConfigurationsByChainId = {};
      networkController.addNetwork.mockRejectedValue(
        new Error('Network addition failed'),
      );
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data?.address).toEqual(mockAccountState.address);
      });

      expect(mockEnableNetwork).not.toHaveBeenCalled();
      expect(mockEnableNetworkInNamespace).not.toHaveBeenCalled();
      expect(mockGetAccountState).toHaveBeenCalledWith({});
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Network addition failed' }),
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'ensurePolygonNetwork',
          }),
        }),
      );
    });
  });

  describe('default parameters', () => {
    it('enables the query by default', async () => {
      const { Wrapper } = createWrapper();
      renderHook(() => usePredictAccountState(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });
    });
  });
});
