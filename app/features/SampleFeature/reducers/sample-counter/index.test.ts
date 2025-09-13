import {
  increment,
  setCount,
  selectCount,
  initialState,
  default as reducer,
} from './index';
import { RootState } from '../../../../reducers';
import initialRootState from '../../../../util/test/initial-root-state';

// Create a minimal mock state for testing
const createMockState = (count: number): RootState => ({
  ...initialRootState,
  sampleCounter: { count },
});

describe('Sample Counter Slice', () => {
  describe('initial state', () => {
    it('initializes with count set to zero', () => {
      expect(initialState).toEqual({
        count: 0,
      });
    });
  });

  describe('increment action', () => {
    it('increases count by one', () => {
      const state = { count: 0 };

      const nextState = reducer(state, increment());

      expect(nextState.count).toBe(1);
    });

    it('increases count from non-zero value', () => {
      const state = { count: 5 };

      const nextState = reducer(state, increment());

      expect(nextState.count).toBe(6);
    });
  });

  describe('setCount action', () => {
    it('updates count to specified value', () => {
      const state = { count: 0 };
      const newCount = 42;

      const nextState = reducer(state, setCount(newCount));

      expect(nextState.count).toBe(newCount);
    });

    it('overwrites existing count value', () => {
      const state = { count: 10 };
      const newCount = 5;

      const nextState = reducer(state, setCount(newCount));

      expect(nextState.count).toBe(newCount);
    });
  });

  describe('state transitions', () => {
    it('maintains state integrity through multiple actions', () => {
      let state = { count: 0 };

      state = reducer(state, increment());
      state = reducer(state, increment());
      state = reducer(state, setCount(10));

      expect(state.count).toBe(10);
    });
  });

  describe('selectCount selector', () => {
    it('retrieves count from state', () => {
      const state = createMockState(42);

      const count = selectCount(state);

      expect(count).toBe(42);
    });

    it('returns zero for initial state', () => {
      const state = createMockState(0);

      const count = selectCount(state);

      expect(count).toBe(0);
    });
  });
});
