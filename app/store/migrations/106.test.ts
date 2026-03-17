import { createMMKV } from 'react-native-mmkv';
import migrate from './106';

const mockMMKVInstance = {
  getAllKeys: jest.fn(),
  clearAll: jest.fn(),
  getString: jest.fn(),
  set: jest.fn(),
  getBoolean: jest.fn(),
  getNumber: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
};

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => mockMMKVInstance),
}));

describe('Migration #106', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should clear PPOM storage when keys exist', () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
    };

    mockMMKVInstance.getAllKeys.mockReturnValue(['key1-0x1', 'key2-0x1']);

    const newState = migrate(oldState);

    expect(createMMKV).toHaveBeenCalledWith({ id: 'PPOMDB' });
    expect(mockMMKVInstance.getAllKeys).toHaveBeenCalled();
    expect(mockMMKVInstance.clearAll).toHaveBeenCalled();
    expect(newState).toEqual(oldState);
  });

  it('should not call clearAll when no keys exist', () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
    };

    mockMMKVInstance.getAllKeys.mockReturnValue([]);

    const newState = migrate(oldState);

    expect(createMMKV).toHaveBeenCalledWith({ id: 'PPOMDB' });
    expect(mockMMKVInstance.getAllKeys).toHaveBeenCalled();
    expect(mockMMKVInstance.clearAll).not.toHaveBeenCalled();
    expect(newState).toEqual(oldState);
  });

  it('should handle errors gracefully', () => {
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

  it('should return state unchanged if state is invalid', () => {
    const invalidStates = [null, undefined, {}, { engine: null }];

    invalidStates.forEach((invalidState) => {
      const newState = migrate(invalidState);
      expect(newState).toEqual(invalidState);
    });
  });
});
