// Unmocking storage-wrapper as it's mocked in testSetup directly
// to allow easy testing of other parts of the app
// but here we want to actually test storage-wrapper
jest.unmock('./storage-wrapper');
import StorageWrapper from './storage-wrapper';

describe('StorageWrapper', () => {
  afterEach(() => {
    StorageWrapper.removeAllListeners();
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
    process.env.IS_TEST = 'true';

    const getItemSpy = jest.spyOn(StorageWrapper, 'getItem');
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

    await StorageWrapper.setItem('test-key', 'test-value');

    const result = await StorageWrapper.getItem('test-key');

    expect(setItemSpy).toHaveBeenCalledWith('test-key', 'test-value');
    expect(getItemSpy).toHaveBeenCalledWith('test-key');
    expect(result).toBe('test-value');
  });

  describe('Event Emitter Functionality', () => {
    it('emits key-specific change event when setItem is called', async () => {
      const mockCallback = jest.fn();
      const unsubscribe = StorageWrapper.onKeyChange('test-key', mockCallback);

      await StorageWrapper.setItem('test-key', 'test-value');

      expect(mockCallback).toHaveBeenCalledWith({
        key: 'test-key',
        value: 'test-value',
        action: 'set',
      });

      unsubscribe();
    });

    it('only emits key-specific events for the correct key', async () => {
      const mockCallbackKey1 = jest.fn();
      const mockCallbackKey2 = jest.fn();

      const unsubscribe1 = StorageWrapper.onKeyChange(
        'test-key-1',
        mockCallbackKey1,
      );
      const unsubscribe2 = StorageWrapper.onKeyChange(
        'test-key-2',
        mockCallbackKey2,
      );

      await StorageWrapper.setItem('test-key-1', 'test-value-1');

      expect(mockCallbackKey1).toHaveBeenCalledWith({
        key: 'test-key-1',
        value: 'test-value-1',
        action: 'set',
      });
      expect(mockCallbackKey2).not.toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });
});
