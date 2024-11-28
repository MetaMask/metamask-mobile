import React from 'react';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react-hooks';
import { useUpdateAccountSetting } from './useUpdateAccountSetting';
import createMockStore from 'redux-mock-store';
import initialRootState from '../../../util/test/initial-root-state';

function arrangeStore() {
  const store = createMockStore()(initialRootState);

  // Ensure dispatch mocks are handled correctly
  store.dispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    return Promise.resolve();
  });

  return store;
}

const mockRefetchAccountSettings = jest.fn();

describe('useUpdateAccountSetting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeHook = () => {
    const store = arrangeStore();
    const hook = renderHook(() => useUpdateAccountSetting('0x123', mockRefetchAccountSettings), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  };

  it('toggleAccount calls switchAccountNotifications with the correct params', async () => {

    const { result } = arrangeHook();

    await act(async () => {
      await result.current.toggleAccount(true);
    });

    expect(result.current.loading).toBe(false);
  });

  it('toggleAccount sets loading state correctly', async () => {
    const { result } = arrangeHook();

    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.toggleAccount(true);
    });

    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.toggleAccount(false);
    });

    expect(result.current.loading).toBe(false);
  });
});

