import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../core/Engine/Engine';
import { useAccountsWithNetworkActivitySync } from './useAccountsWithNetworkActivitySync';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import React from 'react';

jest.mock('../../core/Engine/Engine', () => {
  let contextMock: unknown = {};
  let controllerMessengerMock: unknown = {};
  return {
    __esModule: true,
    default: {
      get context() {
        return contextMock;
      },
      get controllerMessenger() {
        return controllerMessengerMock;
      },
      setMocks({
        context,
        controllerMessenger,
      }: {
        context: unknown;
        controllerMessenger: unknown;
      }) {
        contextMock = context;
        controllerMessengerMock = controllerMessenger;
      },
    },
  };
});

const mockStore = configureMockStore();

export const getWrapper =
  (store: ReturnType<typeof mockStore>) =>
  ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

interface MockEngineInstance {
  context: {
    MultichainNetworkController: {
      getNetworksWithTransactionActivityByAccounts: jest.Mock;
    };
  };
  controllerMessenger: {
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
  };
}

describe('useAccountsWithNetworkActivitySync', () => {
  let fetchAccountsSpy: jest.SpyInstance;
  let subscribeSpy: jest.SpyInstance;
  let unsubscribeSpy: jest.SpyInstance;
  let store: ReturnType<typeof mockStore>;
  let mockEngineInstance: MockEngineInstance;

  afterEach(() => {
    jest.clearAllMocks();
    (
      Engine as unknown as {
        setMocks: ({
          context,
          controllerMessenger,
        }: {
          context: unknown;
          controllerMessenger: unknown;
        }) => void;
      }
    ).setMocks({ context: {}, controllerMessenger: {} });
  });

  it('fetches on first load if basicFunctionalityEnabled is true', async () => {
    store = mockStore({
      settings: { basicFunctionalityEnabled: true },
    });
    mockEngineInstance = {
      context: {
        MultichainNetworkController: {
          getNetworksWithTransactionActivityByAccounts: jest
            .fn()
            .mockResolvedValue(undefined),
        },
      },
      controllerMessenger: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    };
    (
      Engine as unknown as {
        setMocks: ({
          context,
          controllerMessenger,
        }: {
          context: unknown;
          controllerMessenger: unknown;
        }) => void;
      }
    ).setMocks({
      context: mockEngineInstance.context,
      controllerMessenger: mockEngineInstance.controllerMessenger,
    });
    fetchAccountsSpy = jest.spyOn(
      mockEngineInstance.context.MultichainNetworkController,
      'getNetworksWithTransactionActivityByAccounts',
    );
    await act(async () => {
      renderHook(() => useAccountsWithNetworkActivitySync(), {
        wrapper: getWrapper(store),
      });
    });
    expect(fetchAccountsSpy).toHaveBeenCalledTimes(1);
  });

  it('does not fetch on first load if basicFunctionalityEnabled is false', async () => {
    store = mockStore({
      settings: { basicFunctionalityEnabled: false },
    });
    mockEngineInstance = {
      context: {
        MultichainNetworkController: {
          getNetworksWithTransactionActivityByAccounts: jest
            .fn()
            .mockResolvedValue(undefined),
        },
      },
      controllerMessenger: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    };
    (
      Engine as unknown as {
        setMocks: ({
          context,
          controllerMessenger,
        }: {
          context: unknown;
          controllerMessenger: unknown;
        }) => void;
      }
    ).setMocks({
      context: mockEngineInstance.context,
      controllerMessenger: mockEngineInstance.controllerMessenger,
    });
    fetchAccountsSpy = jest.spyOn(
      mockEngineInstance.context.MultichainNetworkController,
      'getNetworksWithTransactionActivityByAccounts',
    );
    await act(async () => {
      renderHook(() => useAccountsWithNetworkActivitySync(), {
        wrapper: getWrapper(store),
      });
    });
    expect(fetchAccountsSpy).not.toHaveBeenCalled();
  });

  it('subscribes and unsubscribes to transactionConfirmed event if onTransactionComplete is true', () => {
    store = mockStore({
      settings: { basicFunctionalityEnabled: true },
    });
    mockEngineInstance = {
      context: {
        MultichainNetworkController: {
          getNetworksWithTransactionActivityByAccounts: jest
            .fn()
            .mockResolvedValue(undefined),
        },
      },
      controllerMessenger: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    };
    (
      Engine as unknown as {
        setMocks: ({
          context,
          controllerMessenger,
        }: {
          context: unknown;
          controllerMessenger: unknown;
        }) => void;
      }
    ).setMocks({
      context: mockEngineInstance.context,
      controllerMessenger: mockEngineInstance.controllerMessenger,
    });
    subscribeSpy = jest.spyOn(
      mockEngineInstance.controllerMessenger,
      'subscribe',
    );
    unsubscribeSpy = jest.spyOn(
      mockEngineInstance.controllerMessenger,
      'unsubscribe',
    );
    const { unmount } = renderHook(() => useAccountsWithNetworkActivitySync(), {
      wrapper: getWrapper(store),
    });
    expect(subscribeSpy).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
    );
    unmount();
    expect(unsubscribeSpy).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
    );
  });

  it('does not subscribe to transactionConfirmed event if onTransactionComplete is false', () => {
    store = mockStore({
      settings: { basicFunctionalityEnabled: true },
    });
    mockEngineInstance = {
      context: {
        MultichainNetworkController: {
          getNetworksWithTransactionActivityByAccounts: jest
            .fn()
            .mockResolvedValue(undefined),
        },
      },
      controllerMessenger: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    };
    (
      Engine as unknown as {
        setMocks: ({
          context,
          controllerMessenger,
        }: {
          context: unknown;
          controllerMessenger: unknown;
        }) => void;
      }
    ).setMocks({
      context: mockEngineInstance.context,
      controllerMessenger: mockEngineInstance.controllerMessenger,
    });
    subscribeSpy = jest.spyOn(
      mockEngineInstance.controllerMessenger,
      'subscribe',
    );
    renderHook(
      () =>
        useAccountsWithNetworkActivitySync({ onTransactionComplete: false }),
      { wrapper: getWrapper(store) },
    );
    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('manual fetch works', async () => {
    store = mockStore({
      settings: { basicFunctionalityEnabled: true },
    });
    mockEngineInstance = {
      context: {
        MultichainNetworkController: {
          getNetworksWithTransactionActivityByAccounts: jest
            .fn()
            .mockResolvedValue(undefined),
        },
      },
      controllerMessenger: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    };
    (
      Engine as unknown as {
        setMocks: ({
          context,
          controllerMessenger,
        }: {
          context: unknown;
          controllerMessenger: unknown;
        }) => void;
      }
    ).setMocks({
      context: mockEngineInstance.context,
      controllerMessenger: mockEngineInstance.controllerMessenger,
    });
    fetchAccountsSpy = jest.spyOn(
      mockEngineInstance.context.MultichainNetworkController,
      'getNetworksWithTransactionActivityByAccounts',
    );
    const { result } = renderHook(
      () => useAccountsWithNetworkActivitySync({ onFirstLoad: false }),
      {
        wrapper: getWrapper(store),
      },
    );
    await act(async () => {
      await result.current.fetchAccountsWithActivity();
    });
    expect(fetchAccountsSpy).toHaveBeenCalledTimes(1);
  });

  it('does not fetch on first load if onFirstLoad is false', async () => {
    store = mockStore({
      settings: { basicFunctionalityEnabled: true },
    });
    mockEngineInstance = {
      context: {
        MultichainNetworkController: {
          getNetworksWithTransactionActivityByAccounts: jest
            .fn()
            .mockResolvedValue(undefined),
        },
      },
      controllerMessenger: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    };
    (
      Engine as unknown as {
        setMocks: ({
          context,
          controllerMessenger,
        }: {
          context: unknown;
          controllerMessenger: unknown;
        }) => void;
      }
    ).setMocks({
      context: mockEngineInstance.context,
      controllerMessenger: mockEngineInstance.controllerMessenger,
    });
    fetchAccountsSpy = jest.spyOn(
      mockEngineInstance.context.MultichainNetworkController,
      'getNetworksWithTransactionActivityByAccounts',
    );
    await act(async () => {
      renderHook(
        () => useAccountsWithNetworkActivitySync({ onFirstLoad: false }),
        {
          wrapper: getWrapper(store),
        },
      );
    });
    expect(fetchAccountsSpy).not.toHaveBeenCalled();
  });
});
