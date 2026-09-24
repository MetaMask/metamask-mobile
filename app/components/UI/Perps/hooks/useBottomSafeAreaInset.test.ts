import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useBottomSafeAreaInset } from './useBottomSafeAreaInset';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaFrame: jest.fn(),
  useSafeAreaInsets: jest.fn(),
}));

const mockUseWindowDimensions = jest.mocked(useWindowDimensions);
const mockUseSafeAreaFrame = jest.mocked(useSafeAreaFrame);
const mockUseSafeAreaInsets = jest.mocked(useSafeAreaInsets);

const WINDOW_HEIGHT = 914;
const WINDOW_WIDTH = 411;

const arrangeInsets = ({
  insetBottom,
  frameHeight,
  frameY = 0,
}: {
  insetBottom: number;
  frameHeight: number;
  frameY?: number;
}) => {
  mockUseSafeAreaInsets.mockReturnValue({
    top: 24,
    bottom: insetBottom,
    left: 0,
    right: 0,
  });
  mockUseSafeAreaFrame.mockReturnValue({
    x: 0,
    y: frameY,
    width: WINDOW_WIDTH,
    height: frameHeight,
  });
  mockUseWindowDimensions.mockReturnValue({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    scale: 2.625,
    fontScale: 1,
  });
};

describe('useBottomSafeAreaInset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the reported inset when the platform provides one', () => {
    arrangeInsets({ insetBottom: 34, frameHeight: WINDOW_HEIGHT - 34 });

    const { result } = renderHook(() => useBottomSafeAreaInset());

    expect(result.current).toBe(34);
  });

  it('derives the gesture navigation bar inset when the reported inset is zero', () => {
    arrangeInsets({ insetBottom: 0, frameHeight: WINDOW_HEIGHT - 24 });

    const { result } = renderHook(() => useBottomSafeAreaInset());

    expect(result.current).toBe(24);
  });

  it('derives the three-button navigation bar inset when the reported inset is zero', () => {
    arrangeInsets({ insetBottom: 0, frameHeight: WINDOW_HEIGHT - 48 });

    const { result } = renderHook(() => useBottomSafeAreaInset());

    expect(result.current).toBe(48);
  });

  it('accounts for a frame offset from the top of the window', () => {
    arrangeInsets({
      insetBottom: 0,
      frameY: 24,
      frameHeight: WINDOW_HEIGHT - 24 - 48,
    });

    const { result } = renderHook(() => useBottomSafeAreaInset());

    expect(result.current).toBe(48);
  });

  it('returns zero when there is no navigation bar to clear', () => {
    arrangeInsets({ insetBottom: 0, frameHeight: WINDOW_HEIGHT });

    const { result } = renderHook(() => useBottomSafeAreaInset());

    expect(result.current).toBe(0);
  });

  it('returns zero when the frame is taller than the window', () => {
    arrangeInsets({ insetBottom: 0, frameHeight: WINDOW_HEIGHT + 10 });

    const { result } = renderHook(() => useBottomSafeAreaInset());

    expect(result.current).toBe(0);
  });
});
