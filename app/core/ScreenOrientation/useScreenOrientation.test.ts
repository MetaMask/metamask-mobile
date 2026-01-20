import { renderHook, act } from '@testing-library/react-hooks';
import { useScreenOrientation } from './useScreenOrientation';
import { ScreenOrientationService } from './ScreenOrientationService';

jest.mock('./ScreenOrientationService');

const mockLockToPortrait =
  ScreenOrientationService.lockToPortrait as jest.MockedFunction<
    typeof ScreenOrientationService.lockToPortrait
  >;
const mockAllowLandscape =
  ScreenOrientationService.allowLandscape as jest.MockedFunction<
    typeof ScreenOrientationService.allowLandscape
  >;

describe('useScreenOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLockToPortrait.mockResolvedValue(undefined);
    mockAllowLandscape.mockResolvedValue(undefined);
  });

  describe('when allowLandscape is true', () => {
    it('calls allowLandscape on mount', async () => {
      await act(async () => {
        renderHook(() => useScreenOrientation({ allowLandscape: true }));
      });

      expect(mockAllowLandscape).toHaveBeenCalled();
    });

    it('calls lockToPortrait on unmount', async () => {
      let unmountFn: () => void;

      await act(async () => {
        const { unmount } = renderHook(() =>
          useScreenOrientation({ allowLandscape: true }),
        );
        unmountFn = unmount;
      });

      jest.clearAllMocks();

      act(() => {
        unmountFn();
      });

      expect(mockLockToPortrait).toHaveBeenCalled();
    });
  });

  describe('when allowLandscape is false', () => {
    it('does not call allowLandscape on mount', async () => {
      await act(async () => {
        renderHook(() => useScreenOrientation({ allowLandscape: false }));
      });

      expect(mockAllowLandscape).not.toHaveBeenCalled();
    });

    it('does not call lockToPortrait on unmount when never unlocked', async () => {
      let unmountFn: () => void;

      await act(async () => {
        const { unmount } = renderHook(() =>
          useScreenOrientation({ allowLandscape: false }),
        );
        unmountFn = unmount;
      });

      jest.clearAllMocks();

      act(() => {
        unmountFn();
      });

      expect(mockLockToPortrait).not.toHaveBeenCalled();
    });
  });

  describe('when allowLandscape changes', () => {
    it('calls allowLandscape when changed from false to true', async () => {
      const { rerender } = renderHook(
        ({ allowLandscape }) => useScreenOrientation({ allowLandscape }),
        { initialProps: { allowLandscape: false } },
      );

      jest.clearAllMocks();

      await act(async () => {
        rerender({ allowLandscape: true });
      });

      expect(mockAllowLandscape).toHaveBeenCalled();
    });

    it('calls lockToPortrait when changed from true to false', async () => {
      const { rerender } = renderHook(
        ({ allowLandscape }) => useScreenOrientation({ allowLandscape }),
        { initialProps: { allowLandscape: true } },
      );

      await act(async () => {
        // Allow the initial mount effect to run
      });

      jest.clearAllMocks();

      await act(async () => {
        rerender({ allowLandscape: false });
      });

      expect(mockLockToPortrait).toHaveBeenCalled();
    });
  });
});
