import { renderHook } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import Engine from '../../core/Engine';
import type { RootState } from '../../reducers';
import configureStore from '../../util/test/configureStore';
import useSubscriptionPolling from './useSubscriptionPolling';

jest.mock('../../core/Engine', () => ({
  context: {
    SubscriptionController: {
      startPolling: jest.fn(() => 'subscription-poll-token'),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

const mockedSubscriptionController = Engine.context
  .SubscriptionController as unknown as {
  startPolling: jest.Mock;
  stopPollingByPollingToken: jest.Mock;
};

const createBackgroundState = ({
  isSignedIn = true,
  isUnlocked = true,
  isUiOpen = true,
}: {
  isSignedIn?: boolean;
  isUnlocked?: boolean;
  isUiOpen?: boolean;
} = {}) => ({
  AuthenticationController: { isSignedIn },
  KeyringController: { isUnlocked, keyrings: [] },
  ClientController: { isUiOpen },
});

const renderUseSubscriptionPolling = ({
  enabled,
  isSignedIn = true,
  isUnlocked = true,
  isUiOpen = true,
}: {
  enabled: boolean;
  isSignedIn?: boolean;
  isUnlocked?: boolean;
  isUiOpen?: boolean;
}) => {
  const state = {
    engine: {
      backgroundState: createBackgroundState({
        isSignedIn,
        isUnlocked,
        isUiOpen,
      }),
    },
  } as unknown as RootState;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(state)}>{children}</Provider>
  );

  return renderHook(() => useSubscriptionPolling({ enabled }), {
    wrapper: Wrapper,
  });
};

describe('useSubscriptionPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubscriptionController.startPolling.mockReturnValue(
      'subscription-poll-token',
    );
  });

  it('does not poll when disabled', () => {
    renderUseSubscriptionPolling({ enabled: false });

    expect(mockedSubscriptionController.startPolling).not.toHaveBeenCalled();
  });

  it('does not poll when the user is signed out', () => {
    renderUseSubscriptionPolling({ enabled: true, isSignedIn: false });

    expect(mockedSubscriptionController.startPolling).not.toHaveBeenCalled();
  });

  it('does not poll when the keyring is locked', () => {
    renderUseSubscriptionPolling({ enabled: true, isUnlocked: false });

    expect(mockedSubscriptionController.startPolling).not.toHaveBeenCalled();
  });

  it('does not poll when the UI is backgrounded', () => {
    renderUseSubscriptionPolling({ enabled: true, isUiOpen: false });

    expect(mockedSubscriptionController.startPolling).not.toHaveBeenCalled();
  });

  it('starts exactly one poll when every gate is true', () => {
    renderUseSubscriptionPolling({ enabled: true });

    expect(mockedSubscriptionController.startPolling).toHaveBeenCalledTimes(1);
  });

  it('stops and restarts polling from the same input when gates change', () => {
    const gates = {
      enabled: true,
      isSignedIn: true,
      isUnlocked: true,
      isUiOpen: true,
    };

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const state = {
        engine: {
          backgroundState: createBackgroundState({
            isSignedIn: gates.isSignedIn,
            isUnlocked: gates.isUnlocked,
            isUiOpen: gates.isUiOpen,
          }),
        },
      } as unknown as RootState;

      return <Provider store={configureStore(state)}>{children}</Provider>;
    };

    const { rerender } = renderHook(
      () => useSubscriptionPolling({ enabled: gates.enabled }),
      { wrapper: Wrapper },
    );

    const firstInput =
      mockedSubscriptionController.startPolling.mock.calls[0][0];

    gates.isUiOpen = false;
    rerender(undefined);

    expect(
      mockedSubscriptionController.stopPollingByPollingToken,
    ).toHaveBeenCalledWith('subscription-poll-token');
    expect(mockedSubscriptionController.startPolling).toHaveBeenCalledTimes(1);

    gates.isUiOpen = true;
    rerender(undefined);

    expect(mockedSubscriptionController.startPolling).toHaveBeenCalledTimes(2);
    expect(mockedSubscriptionController.startPolling.mock.calls[1][0]).toBe(
      firstInput,
    );
  });

  it('stops the active token on unmount', () => {
    const { unmount } = renderUseSubscriptionPolling({ enabled: true });

    unmount();

    expect(
      mockedSubscriptionController.stopPollingByPollingToken,
    ).toHaveBeenCalledWith('subscription-poll-token');
  });
});
