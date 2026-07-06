import reducer, {
  initialState,
  setWhatsHappeningOutdatedItemId,
  clearWhatsHappeningOutdatedItemId,
  selectWhatsHappeningOutdatedItemId,
} from '.';
import type { RootState } from '..';

describe('whatsHappeningDeeplink reducer', () => {
  it('returns the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toStrictEqual(initialState);
    expect(initialState.outdatedItemId).toBeNull();
  });

  it('sets the outdated item id', () => {
    const state = reducer(
      initialState,
      setWhatsHappeningOutdatedItemId('abc-123'),
    );

    expect(state.outdatedItemId).toBe('abc-123');
  });

  it('overwrites an existing id', () => {
    const state = reducer(
      { outdatedItemId: 'old' },
      setWhatsHappeningOutdatedItemId('new'),
    );

    expect(state.outdatedItemId).toBe('new');
  });

  it('accepts null via the setter', () => {
    const state = reducer(
      { outdatedItemId: 'abc' },
      setWhatsHappeningOutdatedItemId(null),
    );

    expect(state.outdatedItemId).toBeNull();
  });

  it('clears the outdated item id', () => {
    const state = reducer(
      { outdatedItemId: 'abc-123' },
      clearWhatsHappeningOutdatedItemId(),
    );

    expect(state.outdatedItemId).toBeNull();
  });
});

describe('selectWhatsHappeningOutdatedItemId', () => {
  it('selects the outdated item id from state', () => {
    const state = {
      whatsHappeningDeeplink: { outdatedItemId: 'xyz' },
    } as unknown as RootState;

    expect(selectWhatsHappeningOutdatedItemId(state)).toBe('xyz');
  });

  it('returns null when no item id is set', () => {
    const state = {
      whatsHappeningDeeplink: { outdatedItemId: null },
    } as unknown as RootState;

    expect(selectWhatsHappeningOutdatedItemId(state)).toBeNull();
  });
});
