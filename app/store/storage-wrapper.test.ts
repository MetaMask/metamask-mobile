import StorageWrapper from './storage-wrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.unmock('./storage-wrapper');

jest.mock('../util/test/utils', () => ({
  isTest: false,
}));

// Keep network-store mock just for the fallback test
jest.mock('../util/test/network-store', () => ({
  default: {
    getString: jest.fn().mockImplementation(() => {
      throw new Error('Primary storage failed');
    }),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  },
}));

describe('StorageWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('return the value from Storage Wrapper', async () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    const getItemSpy = jest.spyOn(StorageWrapper, 'getItem');

    await StorageWrapper.setItem('test-key', 'test-value');

    const result = await StorageWrapper.getItem('test-key');

    expect(setItemSpy).toHaveBeenCalledWith('test-key', 'test-value');
    expect(getItemSpy).toHaveBeenCalledWith('test-key');
    expect(result).toBe('test-value');
  });
  it('throws when setItem value param is not a string', async () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

    try {
      //@ts-expect-error - Expected to test non string scenario
      await StorageWrapper.setItem('test-key', 123);
    } catch (error) {
      const e = error as unknown as Error;
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe(
        'MMKV value must be a string, received value 123 for key test-key',
      );
    }

    expect(setItemSpy).toHaveBeenCalledWith('test-key', 123);
  });

  it('removes value from the store', async () => {
    const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
    await StorageWrapper.setItem('test-key', 'test-value');

    const resultBeforeRemove = await StorageWrapper.getItem('test-key');
    expect(resultBeforeRemove).toBe('test-value');

    await StorageWrapper.removeItem('test-key');
    expect(removeItemSpy).toHaveBeenCalledWith('test-key');

    const resultAfterRemoval = await StorageWrapper.getItem('test-key');
    expect(resultAfterRemoval).toBeNull();
  });

  it('removes all values from the store', async () => {
    const clearAllSpy = jest.spyOn(StorageWrapper, 'clearAll');
    await StorageWrapper.setItem('test-key', 'test-value');
    await StorageWrapper.setItem('test-key-2', 'test-value');

    const resultBeforeRemove = await StorageWrapper.getItem('test-key');
    const result2BeforeRemove = await StorageWrapper.getItem('test-key-2');

    expect(resultBeforeRemove).toBe('test-value');
    expect(result2BeforeRemove).toBe('test-value');

    await StorageWrapper.clearAll();
    expect(clearAllSpy).toHaveBeenCalled();

    const result = await StorageWrapper.getItem('test-key');
    const result2 = await StorageWrapper.getItem('test-key-2');
    expect(result).toBeNull();
    expect(result2).toBeNull();
  });

  it('singleton instance is defined and unique', () => {
    expect(StorageWrapper).toBeDefined();
    expect(StorageWrapper.getItem).toBeDefined();
    expect(StorageWrapper.setItem).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const storageWrapper = require('./storage-wrapper').default;

    expect(StorageWrapper).toBe(storageWrapper);
  });

  it('use ReadOnlyStore on E2E', async () => {
    // Reset modules before changing mocks
    jest.resetModules();

    // Mock isTest as true for this specific test
    jest.doMock('../util/test/utils', () => ({
      isTest: true,
    }));

    // Mock ReadOnlyNetworkStore with implementation for this test
    jest.doMock('../util/test/network-store', () => ({
      default: {
        getString: jest.fn().mockResolvedValue('test-value'),
        set: jest.fn(),
        delete: jest.fn(),
        clearAll: jest.fn(),
      },
    }));

    // Load StorageWrapper with the new mock
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const StorageWrapperReloaded = require('./storage-wrapper').default;

    const getItemSpy = jest.spyOn(StorageWrapperReloaded, 'getItem');
    const setItemSpy = jest.spyOn(StorageWrapperReloaded, 'setItem');
    const deleteItemSpy = jest.spyOn(StorageWrapperReloaded, 'removeItem');

    await StorageWrapperReloaded.setItem('test-key', 'test-value');
    const currentItemValue = await StorageWrapperReloaded.getItem('test-key');
    await StorageWrapperReloaded.removeItem('test-key');
    const itemValueAfterRemoval = await StorageWrapperReloaded.getItem('test-key');

    expect(setItemSpy).toHaveBeenCalledWith('test-key', 'test-value');
    expect(getItemSpy).toHaveBeenCalledWith('test-key');
    expect(deleteItemSpy).toHaveBeenCalledWith('test-key');
    expect(currentItemValue).toBe('test-value');
    expect(itemValueAfterRemoval).toBeNull();
  });

  it('falls back to AsyncStorage in test mode when primary storage fails', async () => {
    jest.resetModules();

    jest.doMock('../util/test/utils', () => ({
      isTest: true,
    }));

    // Mock ReadOnlyNetworkStore to throw for this test
    jest.doMock('../util/test/network-store', () => ({
      default: {
        getString: jest.fn().mockImplementation(() => {
          throw new Error('Primary storage failed');
        }),
        set: jest.fn(),
        delete: jest.fn(),
        clearAll: jest.fn(),
      },
    }));

    // Load StorageWrapper with the new mock
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const StorageWrapperReloaded = require('./storage-wrapper').default;

    // Spy on AsyncStorage.getItem
    const asyncStorageSpy = jest.spyOn(AsyncStorage, 'getItem');

    // Configure AsyncStorage mock to return a value
    asyncStorageSpy.mockResolvedValue('fallback-value');

    // Call getItem which should trigger the fallback
    const result = await StorageWrapperReloaded.getItem('test-key');

    // Verify AsyncStorage was called as fallback
    expect(asyncStorageSpy).toHaveBeenCalledWith('test-key');

    // Verify we got the value from AsyncStorage
    expect(result).toBe('fallback-value');
  });
});
