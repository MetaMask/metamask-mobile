/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useRewardsIconAnimation } from './useRewardsIconAnimation';
import { useRef } from 'react';

// Mock .riv file to prevent Jest parsing binary data
jest.mock(
  '../../../../../animations/rewards_icon_animations.riv',
  () => 'mocked-riv-file',
);

// Mock rive-react-native
const mockFireState = jest.fn();

// Mock React's useRef
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useRef: jest.fn(),
}));

describe('useRewardsIconAnimation', () => {
  // Create controlled mock refs
  const mockRiveRef = {
    current: {
      fireState: mockFireState,
    },
  };

  const mockPreviousPointsRef = {
    current: null,
  };

  const mockUseRef = useRef as jest.MockedFunction<typeof useRef>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock refs
    mockRiveRef.current = {
      fireState: mockFireState,
    };
    mockPreviousPointsRef.current = null;

    // Mock useRef to return our controlled refs
    // The hook calls useRef twice: first for riveRef, second for previousPointsRef
    mockUseRef
      .mockReturnValueOnce(mockRiveRef) // First call - riveRef
      .mockReturnValueOnce(mockPreviousPointsRef); // Second call - previousPointsRef
  });

  const defaultParams = {
    isRewardsLoading: false,
    estimatedPoints: null,
    hasRewardsError: false,
    shouldShowRewardsRow: true,
  };

  describe('initialization', () => {
    it('returns a riveRef object', () => {
      // Act
      const { result } = renderHookWithProvider(() =>
        useRewardsIconAnimation(defaultParams),
      );

      // Assert
      expect(result.current.riveRef).toBe(mockRiveRef);
    });
  });

  describe('animation triggers', () => {
    it('does not trigger animations when shouldShowRewardsRow is false', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          shouldShowRewardsRow: false,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockFireState).not.toHaveBeenCalled();
    });

    it('does not trigger animations when riveRef.current is null', () => {
      // Arrange - set ref to null
      mockRiveRef.current = null as any;

      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockFireState).not.toHaveBeenCalled();
    });

    it('triggers Disable when isRewardsLoading is true', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          isRewardsLoading: true,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
    });

    it('triggers Disable when hasRewardsError is true', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          hasRewardsError: true,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
    });

    it('triggers Start when estimatedPoints > 0 and not loading/error', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Start');
    });

    it('does not trigger Start when estimatedPoints is 0', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 0,
        }),
      );

      // Assert
      expect(mockFireState).not.toHaveBeenCalled();
    });

    it('does not trigger Start when estimatedPoints is null', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: null,
        }),
      );

      // Assert
      expect(mockFireState).not.toHaveBeenCalled();
    });

    it('does not trigger Start when estimatedPoints is negative', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: -100,
        }),
      );

      // Assert
      expect(mockFireState).not.toHaveBeenCalled();
    });
  });

  describe('priority and state combinations', () => {
    it('triggers Disable when both loading and error are true', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          isRewardsLoading: true,
          hasRewardsError: true,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
    });

    it('prioritizes loading state over positive points', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          isRewardsLoading: true,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
    });

    it('prioritizes error state over positive points', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          hasRewardsError: true,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
    });
  });

  describe('state changes and dependency updates', () => {
    it('responds to parameter changes correctly', () => {
      // Arrange - Test separate renders instead of rerender
      // First render with normal state
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert initial call
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Start');

      // Clear and setup for second render
      mockFireState.mockClear();
      mockPreviousPointsRef.current = 100 as any; // Simulate state from first render
      mockUseRef
        .mockReturnValueOnce(mockRiveRef)
        .mockReturnValueOnce(mockPreviousPointsRef);

      // Act - second render with loading state
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
          isRewardsLoading: true,
        }),
      );

      // Assert - should trigger Disable for loading state
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
    });

    it('does not retrigger when points remain unchanged', () => {
      // Arrange - first render should trigger Start
      const { rerender } = renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert initial call
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Start');

      // Setup for rerender - set previous points to same value and setup fresh mocks
      mockFireState.mockClear();
      mockPreviousPointsRef.current = 100 as any; // Previous points same as current
      mockUseRef
        .mockReturnValueOnce(mockRiveRef)
        .mockReturnValueOnce(mockPreviousPointsRef);

      // Act - rerender with same parameters
      rerender(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert - should not trigger again due to unchanged points
      expect(mockFireState).not.toHaveBeenCalled();
    });

    it('triggers when points change from previous value', () => {
      // Arrange
      mockPreviousPointsRef.current = 50 as any; // Set different previous value

      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Start');
    });

    it('triggers when transitioning from loading to points', () => {
      // Arrange
      mockPreviousPointsRef.current = 0 as any; // Previous was 0 due to loading

      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          isRewardsLoading: false,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Start');
    });
  });

  describe('error handling', () => {
    it('handles errors when fireState throws', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRiveRef.current.fireState.mockImplementation(() => {
        throw new Error('Rive error');
      });

      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error triggering Rive animation:',
        expect.any(Error),
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('updates previousPointsRef even when fireState throws', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRiveRef.current.fireState.mockImplementation(() => {
        throw new Error('Rive error');
      });

      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          estimatedPoints: 100,
        }),
      );

      // Assert
      expect(mockPreviousPointsRef.current).toBe(100);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('handles error state correctly when estimatedPoints is non-zero', () => {
      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          hasRewardsError: true,
          estimatedPoints: 100,
        }),
      );

      // Assert - should prioritize error state
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
      // Should set currentPoints to 0 due to error, then update previousPointsRef
      expect(mockPreviousPointsRef.current).toBe(0);
    });

    it('does not trigger during loading even with positive previous points', () => {
      // Arrange
      mockPreviousPointsRef.current = 100 as any;

      // Act
      renderHookWithProvider(() =>
        useRewardsIconAnimation({
          ...defaultParams,
          isRewardsLoading: true,
          estimatedPoints: 150,
        }),
      );

      // Assert
      expect(mockFireState).toHaveBeenCalledWith('State Machine 1', 'Disable');
    });
  });
});
