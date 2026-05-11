import { createMMKV } from 'react-native-mmkv';

import migrate from './136';
import { ensureValidState } from './util';

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

describe('migration 136', () => {
  const mockRemove = jest.fn();
  const mockGetString = jest.fn();

  const mockMMKVInstance = {
    getString: mockGetString,
    remove: mockRemove,
  };

  (createMMKV as jest.Mock).mockImplementation(() => mockMMKVInstance);

  const baseState = {
    engine: { backgroundState: {} },
    attribution: { attribution: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureValidState).mockReturnValue(true);
  });

  it('returns state unchanged when ensureValidState is false', () => {
    jest.mocked(ensureValidState).mockReturnValueOnce(false);
    const state = { ...baseState };

    expect(migrate(state)).toBe(state);
    expect(createMMKV).not.toHaveBeenCalled();
  });

  it('does nothing when legacy storage has no key', () => {
    mockGetString.mockReturnValue(undefined);

    const state = { ...baseState };
    const result = migrate(state);

    expect(createMMKV).toHaveBeenCalledWith({
      id: 'redux-persist-attribution',
    });
    expect(mockGetString).toHaveBeenCalledWith('persist:attribution');
    expect(mockRemove).not.toHaveBeenCalled();
    expect(result).toEqual(baseState);
  });

  it('migrates legacy non-null attribution when current is null', () => {
    const legacyPayload = {
      _persist: { version: -1, rehydrated: false },
      attribution: {
        utm_source: 'x',
        capturedAt: 1,
      },
    };
    mockGetString.mockReturnValue(JSON.stringify(legacyPayload));

    const state = {
      engine: { backgroundState: {} },
      attribution: { attribution: null },
    };

    const result = migrate(state);

    expect(result).toEqual({
      engine: { backgroundState: {} },
      attribution: {
        attribution: {
          utm_source: 'x',
          capturedAt: 1,
        },
      },
    });
    expect(mockRemove).toHaveBeenCalledWith('persist:attribution');
  });

  it('does not overwrite when current attribution is already set', () => {
    const legacyPayload = {
      attribution: { utm_source: 'legacy', capturedAt: 1 },
    };
    mockGetString.mockReturnValue(JSON.stringify(legacyPayload));

    const existing = {
      utm_source: 'current',
      capturedAt: 2,
    };
    const state = {
      engine: { backgroundState: {} },
      attribution: { attribution: existing },
    };

    const result = migrate(state);

    expect(result).toEqual(state);
    expect(mockRemove).toHaveBeenCalledWith('persist:attribution');
  });

  it('removes invalid legacy payload without merging', () => {
    mockGetString.mockReturnValue('not-json');

    const state = { ...baseState };
    migrate(state);

    expect(mockRemove).toHaveBeenCalledWith('persist:attribution');
  });

  it('handles MMKV errors without throwing', () => {
    mockGetString.mockImplementation(() => {
      throw new Error('boom');
    });

    const state = { ...baseState };
    expect(() => migrate(state)).not.toThrow();
    expect(state).toEqual(baseState);
  });

  it('removes persisted key when legacy JSON has no attribution field', () => {
    mockGetString.mockReturnValue(JSON.stringify({ other: true }));

    const state = { ...baseState };
    migrate(state);

    expect(mockRemove).toHaveBeenCalledWith('persist:attribution');
  });

  it('removes key when attribution is null without merging root state', () => {
    mockGetString.mockReturnValue(
      JSON.stringify({ attribution: null, _persist: {} }),
    );

    const state = { ...baseState };
    migrate(state);

    expect(state.attribution?.attribution).toBeNull();
    expect(mockRemove).toHaveBeenCalledWith('persist:attribution');
  });

  it('removes key when attribution object lacks capturedAt', () => {
    mockGetString.mockReturnValue(
      JSON.stringify({ attribution: { utm_source: 'x' } }),
    );

    const state = { ...baseState };
    migrate(state);

    expect(mockRemove).toHaveBeenCalledWith('persist:attribution');
    expect(state).toEqual(baseState);
  });

  it('treats malformed root attribution as current null without throwing', () => {
    mockGetString.mockReturnValue(
      JSON.stringify({ attribution: [{ bad: true }] }),
    );

    const state = {
      engine: { backgroundState: {} },
      attribution: 'not-an-object',
    };

    migrate(state);

    expect(mockRemove).toHaveBeenCalledWith('persist:attribution');
  });
});
