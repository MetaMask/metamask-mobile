import { MMKV } from 'react-native-mmkv';
import migrate from './108';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(),
}));

describe('Migration #108', () => {
  const mockMMKVInstance = {
    getAllKeys: jest.fn(),
    clearAll: jest.fn(),
  };

  (MMKV as jest.Mock).mockImplementation(() => mockMMKVInstance);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('clears PPOM storage when keys exist', () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
    };

    mockMMKVInstance.getAllKeys.mockReturnValue(['key1-0x1', 'key2-0x1']);

    const newState = migrate(oldState);

    expect(MMKV).toHaveBeenCalledWith({ id: 'PPOMDB' });
    expect(mockMMKVInstance.getAllKeys).toHaveBeenCalled();
    expect(mockMMKVInstance.clearAll).toHaveBeenCalled();
    expect(newState).toEqual(oldState);
  });

  it('does not call clearAll when no keys exist', () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
    };

    mockMMKVInstance.getAllKeys.mockReturnValue([]);

    const newState = migrate(oldState);

    expect(MMKV).toHaveBeenCalledWith({ id: 'PPOMDB' });
    expect(mockMMKVInstance.getAllKeys).toHaveBeenCalled();
    expect(mockMMKVInstance.clearAll).not.toHaveBeenCalled();
    expect(newState).toEqual(oldState);
  });

  it('returns state unchanged when getAllKeys throws error', () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
    };

    mockMMKVInstance.getAllKeys.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const newState = migrate(oldState);

    expect(newState).toEqual(oldState);
  });

  it('returns state unchanged when state is invalid', () => {
    const invalidStates = [null, undefined, {}, { engine: null }];

    invalidStates.forEach((invalidState) => {
      const newState = migrate(invalidState);
      expect(newState).toEqual(invalidState);
    });
  });
});
