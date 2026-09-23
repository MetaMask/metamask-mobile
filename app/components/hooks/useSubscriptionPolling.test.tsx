import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../core/Engine';
import type { RootState } from '../../reducers';
import configureStore from '../../util/test/configureStore';
import useSubscriptionPolling from './useSubscriptionPolling';

jest.mock('../../core/Engine', () => ({
  context: {
    SubscriptionController: {
      getSubscriptions: jest.fn(),
    },
  },
}));

const mockedSubscriptionController = Engine.context
  .SubscriptionController as unknown as {
  getSubscriptions: jest.Mock;
};

const createBackgroundState = ({
  isSignedIn = true,
  isUnlocked = true,
}: {
  isSignedIn?: boolean;
  isUnlocked?: boolean;
} = {}) => ({
  AuthenticationController: { isSignedIn },
  KeyringController: { isUnlocked, keyrings: [] },
});

const renderUseSubscriptionPolling = ({
  enabled,
  isSignedIn = true,
  isUnlocked = true,
}: {
  enabled: boolean;
  isSignedIn?: boolean;
  isUnlocked?: boolean;
}) => {
  const state = {
    engine: {
      backgroundState: createBackgroundState({ isSignedIn, isUnlocked }),
    },
  } as unknown as RootState;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(state)}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  return renderHook(() => useSubscriptionPolling({ enabled }), {
    wrapper: Wrapper,
  });
};

describe('useSubscriptionPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubscriptionController.getSubscriptions.mockResolvedValue([]);
  });

  it('does not fetch when disabled', () => {
    renderUseSubscriptionPolling({ enabled: false });

    expect(
      mockedSubscriptionController.getSubscriptions,
    ).not.toHaveBeenCalled();
  });

  it('does not fetch when the user is signed out', () => {
    renderUseSubscriptionPolling({ enabled: true, isSignedIn: false });

    expect(
      mockedSubscriptionController.getSubscriptions,
    ).not.toHaveBeenCalled();
  });

  it('does not fetch when the keyring is locked', () => {
    renderUseSubscriptionPolling({ enabled: true, isUnlocked: false });

    expect(
      mockedSubscriptionController.getSubscriptions,
    ).not.toHaveBeenCalled();
  });

  it('fetches through the controller when every gate is true', async () => {
    const { result } = renderUseSubscriptionPolling({ enabled: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSubscriptionController.getSubscriptions).toHaveBeenCalledTimes(
      1,
    );
  });

  it('reports the in-flight fetch so callers can tell unknown from empty', async () => {
    const { result } = renderUseSubscriptionPolling({ enabled: true });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('surfaces a failed fetch as an error instead of empty state', async () => {
    const error = new Error('request failed');
    mockedSubscriptionController.getSubscriptions.mockRejectedValue(error);

    const { result } = renderUseSubscriptionPolling({ enabled: true });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
