import reducer, { initialState, setPositionSort } from '.';
import type { SocialLeaderboardState } from './types';

describe('socialLeaderboard reducer', () => {
  describe('default case', () => {
    it('should return the initial state', () => {
      expect(reducer(undefined, { type: '@@INIT' })).toStrictEqual(
        initialState,
      );
    });

    it('should return current state for unknown action types', () => {
      const existingState: SocialLeaderboardState = {
        positionSort: { open: 'pnl', closed: 'recent' },
      };
      const unknownAction = { type: 'UNKNOWN_ACTION_TYPE' } as const;

      const result = reducer(existingState, unknownAction);

      expect(result).toStrictEqual(existingState);
    });
  });

  describe('setPositionSort', () => {
    it('sets the open tab sort key without touching the closed tab', () => {
      const result = reducer(
        initialState,
        setPositionSort({ tab: 'open', sortKey: 'recent' }),
      );

      expect(result.positionSort.open).toBe('recent');
      expect(result.positionSort.closed).toBe('value');
    });

    it('sets the closed tab sort key without touching the open tab', () => {
      const result = reducer(
        initialState,
        setPositionSort({ tab: 'closed', sortKey: 'pnl' }),
      );

      expect(result.positionSort.closed).toBe('pnl');
      expect(result.positionSort.open).toBe('value');
    });

    it('does not mutate the original state', () => {
      const result = reducer(
        initialState,
        setPositionSort({ tab: 'open', sortKey: 'pnl' }),
      );

      expect(result).not.toBe(initialState);
      expect(initialState.positionSort.open).toBe('value');
    });
  });
});
