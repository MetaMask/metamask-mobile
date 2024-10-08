import StorageWrapper from './storage-wrapper';

describe('StorageWrapper', () => {
  it('should return the value from Storage Wrapper', async () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    const getItemSpy = jest.spyOn(StorageWrapper, 'getItem');

    await StorageWrapper.setItem('test-key', 'test-value');
    getItemSpy.mockResolvedValue('test-value');

    const result = await StorageWrapper.getItem('test-key');

    expect(setItemSpy).toHaveBeenCalledWith('test-key', 'test-value');
    expect(getItemSpy).toHaveBeenCalledWith('test-key');
    expect(result).toBe('test-value');
  });
});
