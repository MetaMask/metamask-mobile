import StorageWrapper from './storage-wrapper';

describe('StorageWrapper', () => {
  it('return the value from Storage Wrapper', async () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    const getItemSpy = jest.spyOn(StorageWrapper, 'getItem');

    await StorageWrapper.setItem('test-key', 'test-value');
    getItemSpy.mockResolvedValue('test-value');

    const result = await StorageWrapper.getItem('test-key');

    expect(setItemSpy).toHaveBeenCalledWith('test-key', 'test-value');
    expect(getItemSpy).toHaveBeenCalledWith('test-key');
    expect(result).toBe('test-value');
  });
  it('throw an error when setItem do not receives a string', async () => {
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

  it('StorageWrapper instance is defined', () => {
    expect(StorageWrapper).toBeDefined();
    expect(StorageWrapper.getItem).toBeDefined();
    expect(StorageWrapper.setItem).toBeDefined();
  });
});
