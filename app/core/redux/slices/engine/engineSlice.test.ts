import { reducer, actions } from './index';
import { configureStore } from '@reduxjs/toolkit';

describe('Engine Slice - reducers', () => {
  const initialState = { backgroundState: {} };
  const initializedState = { isInPolling: false };
  const updatedState = { key: 'isInPolling', engineState: initializedState };

  it('should return the initialized state from reducer', () => {
    expect(
      reducer(
        initialState,
        actions.initializeEngineState(initializedState as any),
      ),
    ).toEqual({
      backgroundState: { isInPolling: false },
    });
  });

  it('should return the updated the state from reducer', () => {
    expect(
      reducer(initialState, actions.updateEngineState(updatedState as any)),
    ).toEqual({
      backgroundState: { isInPolling: false },
    });
  });
});

describe('Engine Slice - store', () => {
  it('should test the store initializes with initial value', () => {
    const store = configureStore({ reducer });
    const initialState = store.getState();

    expect(initialState).toEqual({
      backgroundState: {},
    });
  });

  it('should initial value in store', () => {
    const initializedState = { isInPolling: false };
    const store = configureStore({ reducer });

    store.dispatch(actions.initializeEngineState(initializedState as any));

    const newState = store.getState();
    expect(newState).toEqual({
      backgroundState: { isInPolling: false },
    });
  });

  it('should update value in store', () => {
    const initializedState = { isInPolling: false };
    const updatedState = { key: 'isInPolling', engineState: initializedState };
    const store = configureStore({ reducer });

    store.dispatch(actions.updateEngineState(updatedState as any));

    const newState = store.getState();
    expect(newState).toEqual({
      backgroundState: { isInPolling: false },
    });
  });
});
