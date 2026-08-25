import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';

import Logger from '../../../util/Logger';
import { PopularList } from '../../../util/networks/customNetworks';
import { useAddPopularNetwork } from '../useAddPopularNetwork';
import {
  useAddNetworkIfMissingMutation,
  useAddNetworkIfMissingQuery,
} from './useAddNetworkIfMissing';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});
notifyManager.setNotifyFunction((callback) => {
  act(callback);
});

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));
jest.mock('../useAddPopularNetwork');

const mockUseSelector = jest.mocked(useSelector);
const mockUseAddPopularNetwork = jest.mocked(useAddPopularNetwork);

const robinhoodNetwork = PopularList.find(
  (network) => network.nickname === 'Robinhood Chain',
);
if (!robinhoodNetwork) {
  throw new Error('Robinhood Chain is missing from PopularList');
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });

const teardownQueryClient = async (queryClient: QueryClient) => {
  await act(async () => {
    await queryClient.cancelQueries();
  });
  queryClient.getMutationCache().clear();
  queryClient.getQueryCache().clear();
  queryClient.clear();
};

describe('useAddNetworkIfMissingMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMutationTest = (
    configure?: (mocks: {
      addPopularNetwork: jest.Mock;
      mockSelector: typeof mockUseSelector;
    }) => void,
  ) => {
    const addPopularNetwork = jest.fn().mockResolvedValue(undefined);

    mockUseAddPopularNetwork.mockReturnValue({ addPopularNetwork });
    mockUseSelector.mockReturnValue({});
    configure?.({ addPopularNetwork, mockSelector: mockUseSelector });

    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return {
      addPopularNetwork,
      renderMutation: () => {
        const rendered = renderHook(() => useAddNetworkIfMissingMutation(), {
          wrapper,
        });
        const unmountHook = rendered.unmount;
        const resetMutation = () => rendered.result.current.reset();
        return {
          ...rendered,
          cleanup: async () => {
            resetMutation();
            unmountHook();
            await teardownQueryClient(queryClient);
          },
        };
      },
    };
  };

  it('adds the popular network of a chain the user has not added', async () => {
    const { addPopularNetwork, renderMutation } = arrangeMutationTest();

    const { result, cleanup } = renderMutation();

    const addedNetwork = await act(async () =>
      result.current.mutateAsync(robinhoodNetwork.chainId),
    );

    expect(addedNetwork).toBe(robinhoodNetwork);
    expect(addPopularNetwork).toHaveBeenCalledWith(robinhoodNetwork);
    await cleanup();
  });

  it('resolves with null without adding when the chain is already in the network list', async () => {
    const { addPopularNetwork, renderMutation } = arrangeMutationTest(
      ({ mockSelector }) => {
        mockSelector.mockReturnValue({
          [robinhoodNetwork.chainId as Hex]: {},
        });
      },
    );

    const { result, cleanup } = renderMutation();

    const addedNetwork = await act(async () =>
      result.current.mutateAsync(robinhoodNetwork.chainId),
    );

    expect(addedNetwork).toBeNull();
    expect(addPopularNetwork).not.toHaveBeenCalled();
    await cleanup();
  });

  it.each([
    { description: 'a chain outside PopularList', chainId: '0x539' },
    {
      description: 'a non-EVM chain id',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
  ])('resolves with null for $description', async ({ chainId }) => {
    const { addPopularNetwork, renderMutation } = arrangeMutationTest();

    const { result, cleanup } = renderMutation();

    const addedNetwork = await act(async () =>
      result.current.mutateAsync(chainId),
    );

    expect(addedNetwork).toBeNull();
    expect(addPopularNetwork).not.toHaveBeenCalled();
    await cleanup();
  });

  it('logs the failure instead of surfacing it to callers of mutate', async () => {
    const addError = new Error('addNetwork rejected');
    const onSuccess = jest.fn();
    const loggerErrorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    const { renderMutation } = arrangeMutationTest(
      ({ addPopularNetwork: addNetwork }) => {
        addNetwork.mockRejectedValueOnce(addError);
      },
    );

    const { result, cleanup } = renderMutation();

    await act(async () => {
      result.current.mutate(robinhoodNetwork.chainId, { onSuccess });
    });

    await waitFor(() =>
      expect(loggerErrorSpy).toHaveBeenCalledWith(addError, {
        message: 'Failed to add missing network',
        chainId: robinhoodNetwork.chainId,
      }),
    );
    expect(onSuccess).not.toHaveBeenCalled();
    await cleanup();
  });
});

describe('useAddNetworkIfMissingQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeQueryTest = (
    configure?: (mocks: {
      addPopularNetwork: jest.Mock;
      mockSelector: typeof mockUseSelector;
    }) => void,
  ) => {
    const addPopularNetwork = jest.fn().mockResolvedValue(undefined);

    mockUseAddPopularNetwork.mockReturnValue({ addPopularNetwork });
    mockUseSelector.mockReturnValue({});
    configure?.({ addPopularNetwork, mockSelector: mockUseSelector });

    const queryClient = createTestQueryClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return {
      addPopularNetwork,
      renderQuery: (
        params: Parameters<typeof useAddNetworkIfMissingQuery>[0],
      ) => {
        const rendered = renderHook(() => useAddNetworkIfMissingQuery(params), {
          wrapper,
        });
        const unmountHook = rendered.unmount;
        return {
          ...rendered,
          cleanup: async () => {
            unmountHook();
            await teardownQueryClient(queryClient);
          },
        };
      },
    };
  };

  it('adds the missing network without being invoked', async () => {
    const { addPopularNetwork, renderQuery } = arrangeQueryTest();

    const { cleanup } = renderQuery({ chainId: robinhoodNetwork.chainId });

    await waitFor(() =>
      expect(addPopularNetwork).toHaveBeenCalledWith(robinhoodNetwork),
    );
    await cleanup();
  });

  it('does not add anything when the chain is already in the network list', async () => {
    const { addPopularNetwork, renderQuery } = arrangeQueryTest(
      ({ mockSelector }) => {
        mockSelector.mockReturnValue({
          [robinhoodNetwork.chainId as Hex]: {},
        });
      },
    );

    const { result, cleanup } = renderQuery({
      chainId: robinhoodNetwork.chainId,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(addPopularNetwork).not.toHaveBeenCalled();
    await cleanup();
  });

  it('does not add anything while disabled', async () => {
    const { addPopularNetwork, renderQuery } = arrangeQueryTest();

    const { result, cleanup } = renderQuery({
      chainId: robinhoodNetwork.chainId,
      enabled: false,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(addPopularNetwork).not.toHaveBeenCalled();
    await cleanup();
  });

  it('logs the failure when the network cannot be added', async () => {
    const addError = new Error('addNetwork rejected');
    const loggerErrorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(jest.fn());
    const { renderQuery } = arrangeQueryTest(
      ({ addPopularNetwork: addNetwork }) => {
        addNetwork.mockRejectedValueOnce(addError);
      },
    );

    const { result, cleanup } = renderQuery({
      chainId: robinhoodNetwork.chainId,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(loggerErrorSpy).toHaveBeenCalledWith(addError, {
      message: 'Failed to auto-add missing network',
      chainId: robinhoodNetwork.chainId,
    });
    await cleanup();
  });
});
