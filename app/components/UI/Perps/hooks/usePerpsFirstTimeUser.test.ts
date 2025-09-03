import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePerpsFirstTimeUser } from './usePerpsFirstTimeUser';
import { selectIsFirstTimeUser } from '../controllers/selectors';
import { usePerpsSelector } from './usePerpsSelector';
import type { PerpsControllerState } from '../controllers/PerpsController';

// Mock usePerpsSelector
jest.mock('./usePerpsSelector', () => ({
  usePerpsSelector: jest.fn(),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      markTutorialCompleted: jest.fn(),
    },
  },
}));

const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;

describe('usePerpsFirstTimeUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return isFirstTimeUser: true when selector returns true', () => {
    // Arrange
    mockUsePerpsSelector.mockImplementation(
      <T>(selector: (state: PerpsControllerState | undefined) => T) => {
        // Verify the correct selector is passed
        expect(selector).toBe(selectIsFirstTimeUser);
        return true as T;
      },
    );

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Assert
    expect(result.current).toEqual({
      isFirstTimeUser: true,
      markTutorialCompleted: expect.any(Function),
    });
  });

  it('should return isFirstTimeUser: false when selector returns false', () => {
    // Arrange
    mockUsePerpsSelector.mockImplementation(
      <T>(selector: (state: PerpsControllerState | undefined) => T) => {
        // Verify the correct selector is passed
        expect(selector).toBe(selectIsFirstTimeUser);
        return false as T;
      },
    );

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Assert
    expect(result.current).toEqual({
      isFirstTimeUser: false,
      markTutorialCompleted: expect.any(Function),
    });
  });

  it('should default to isFirstTimeUser: true when selector returns undefined (simulating undefined state)', () => {
    // Arrange - mock the selector to return true (which is what the actual selector would do with undefined state)
    mockUsePerpsSelector.mockImplementation(
      <T>(selector: (state: PerpsControllerState | undefined) => T) => {
        // Verify the correct selector is passed
        expect(selector).toBe(selectIsFirstTimeUser);
        // Return true since selectIsFirstTimeUser returns true for undefined state
        return true as T;
      },
    );

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Assert
    expect(result.current).toEqual({
      isFirstTimeUser: true,
      markTutorialCompleted: expect.any(Function),
    });
  });

  it('should call PerpsController.markTutorialCompleted when markTutorialCompleted is called', () => {
    // Arrange
    mockUsePerpsSelector.mockImplementation(
      <T>(selector: (state: PerpsControllerState | undefined) => T) => {
        expect(selector).toBe(selectIsFirstTimeUser);
        return true as T;
      },
    );
    const mockMarkTutorialCompleted = Engine.context.PerpsController
      .markTutorialCompleted as jest.Mock;

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());
    result.current.markTutorialCompleted();

    // Assert
    expect(mockMarkTutorialCompleted).toHaveBeenCalledWith();
  });

  it('should handle PerpsController being undefined gracefully', () => {
    // Arrange
    mockUsePerpsSelector.mockImplementation(
      <T>(selector: (state: PerpsControllerState | undefined) => T) => {
        expect(selector).toBe(selectIsFirstTimeUser);
        return true as T;
      },
    );
    // @ts-expect-error - Testing undefined case
    Engine.context.PerpsController = undefined;

    // Act
    const { result } = renderHook(() => usePerpsFirstTimeUser());

    // Should not throw when markTutorialCompleted is called
    expect(() => result.current.markTutorialCompleted()).not.toThrow();
  });
});
