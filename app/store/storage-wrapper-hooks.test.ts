import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStorageValue } from './storage-wrapper-hooks';
import StorageWrapper from './storage-wrapper';

// Mock the storage wrapper
jest.mock('./storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  onKeyChange: jest.fn(),
}));

const mockedStorageWrapper = jest.mocked(StorageWrapper);

describe('useStorageValue', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();

    // Default mock implementations
    mockedStorageWrapper.getItem.mockResolvedValue(null);
    mockedStorageWrapper.setItem.mockResolvedValue(undefined);
    mockedStorageWrapper.onKeyChange.mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads initial value and handle loading states', async () => {
    mockedStorageWrapper.getItem.mockResolvedValue('stored-value');

    const { result } = renderHook(() =>
      useStorageValue('test-key', { defaultValue: 'default-value' }),
    );

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.value).toBe('default-value');
    expect(result.current.error).toBe(null);

    // After loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith('test-key');
    expect(result.current.value).toBe('stored-value');
  });

  it('handles loading errors and use default null value when not specified', async () => {
    const mockError = new Error('Storage error');
    mockedStorageWrapper.getItem.mockRejectedValue(mockError);

    const { result } = renderHook(() => useStorageValue('test-key'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.value).toBe(null); // Default when not specified
    expect(result.current.error).toEqual(mockError);
  });

  it('subscribes to key changes and update value from events', async () => {
    let changeCallback: (event: {
      key: string;
      value: string;
      action: 'set';
    }) => void;

    mockedStorageWrapper.onKeyChange.mockImplementation((_key, callback) => {
      changeCallback = callback;
      return mockUnsubscribe;
    });

    const { result, unmount } = renderHook(() => useStorageValue('test-key'));

    expect(mockedStorageWrapper.onKeyChange).toHaveBeenCalledWith(
      'test-key',
      expect.any(Function),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate storage change event
    act(() => {
      changeCallback({ key: 'test-key', value: 'new-value', action: 'set' });
    });

    expect(result.current.value).toBe('new-value');
    expect(result.current.error).toBe(null); // Should clear errors

    // Should unsubscribe on unmount
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('updates storage with setValue and handle errors', async () => {
    const { result } = renderHook(() => useStorageValue('test-key'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Successful setValue
    await act(async () => {
      await result.current.setValue('new-value');
    });

    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      'test-key',
      'new-value',
    );
    expect(result.current.error).toBe(null);

    // setValue error handling
    const mockError = new Error('Set error');
    mockedStorageWrapper.setItem.mockRejectedValue(mockError);

    await act(async () => {
      try {
        await result.current.setValue('error-value');
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    expect(result.current.error).toEqual(mockError);
  });
});
