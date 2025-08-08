import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePerpsFirstTimeUser } from './usePerpsFirstTimeUser';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getIsFirstTimeUser: jest.fn(),
    },
  },
}));

jest.mock('../../Tabs/TabThumbnail/useSelectedAccount', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    caipAccountId: 'eip155:1:0x1234567890123456789012345678901234567890',
  }),
}));

describe('usePerpsFirstTimeUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return isFirstTimeUser: true when controller returns true', async () => {
    // Arrange
    const mockGetIsFirstTimeUser = Engine.context.PerpsController
      .getIsFirstTimeUser as jest.Mock;
    mockGetIsFirstTimeUser.mockResolvedValue(true);

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Wait for the hook to finish loading
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Assert
    expect(mockGetIsFirstTimeUser).toHaveBeenCalledWith({
      accountId: 'eip155:1:0x1234567890123456789012345678901234567890',
    });
    expect(result.current).toEqual({
      isFirstTimeUser: true,
      isLoading: false,
      error: null,
      refresh: expect.any(Function),
    });
  });

  it('should return isFirstTimeUser: false when controller returns false', async () => {
    // Arrange
    const mockGetIsFirstTimeUser = Engine.context.PerpsController
      .getIsFirstTimeUser as jest.Mock;
    mockGetIsFirstTimeUser.mockResolvedValue(false);

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Wait for the hook to finish loading
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Assert
    expect(result.current).toEqual({
      isFirstTimeUser: false,
      isLoading: false,
      error: null,
      refresh: expect.any(Function),
    });
  });

  it('should refresh when calling refresh function', async () => {
    // Arrange
    const mockGetIsFirstTimeUser = Engine.context.PerpsController
      .getIsFirstTimeUser as jest.Mock;
    mockGetIsFirstTimeUser.mockResolvedValueOnce(true);

    // Act - first render
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Verify initial state
    expect(result.current.isFirstTimeUser).toBe(true);

    // Setup for refresh
    mockGetIsFirstTimeUser.mockResolvedValueOnce(false);

    // Act - refresh
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(mockGetIsFirstTimeUser).toHaveBeenCalledTimes(2);
    expect(result.current.isFirstTimeUser).toBe(false);
  });

  it('should handle error and default to isFirstTimeUser: true', async () => {
    // Arrange
    const mockGetIsFirstTimeUser = Engine.context.PerpsController
      .getIsFirstTimeUser as jest.Mock;
    mockGetIsFirstTimeUser.mockRejectedValue(new Error('Test error'));

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Wait for the hook to finish loading
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Assert
    expect(result.current).toEqual({
      isFirstTimeUser: false, // Default to false on error
      isLoading: false,
      error: 'Test error',
      refresh: expect.any(Function),
    });
  });
});
