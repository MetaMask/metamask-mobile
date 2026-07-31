import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { usePreventRemove } from './usePreventRemove';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('usePreventRemove', () => {
  const mockUnsubscribe = jest.fn();
  const mockAddListener = jest.fn().mockReturnValue(mockUnsubscribe);
  const mockAction = { type: 'GO_BACK' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(mockUnsubscribe);
    (useNavigation as jest.Mock).mockReturnValue({
      addListener: mockAddListener,
    });
  });

  it('does not register a beforeRemove listener when preventRemove is false', () => {
    renderHook(() => usePreventRemove(false, jest.fn()));

    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('registers a beforeRemove listener when preventRemove is true', () => {
    renderHook(() => usePreventRemove(true, jest.fn()));

    expect(mockAddListener).toHaveBeenCalledWith(
      'beforeRemove',
      expect.any(Function),
    );
  });

  it('prevents removal and invokes the callback when beforeRemove fires', () => {
    const callback = jest.fn();
    const preventDefault = jest.fn();

    renderHook(() => usePreventRemove(true, callback));

    const listener = mockAddListener.mock.calls[0][1] as (e: {
      preventDefault: () => void;
      data: { action: typeof mockAction };
    }) => void;

    listener({ preventDefault, data: { action: mockAction } });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ data: { action: mockAction } });
  });

  it('unsubscribes when preventRemove becomes false', () => {
    const { rerender } = renderHook(
      ({ preventRemove }) => usePreventRemove(preventRemove, jest.fn()),
      { initialProps: { preventRemove: true } },
    );

    rerender({ preventRemove: false });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => usePreventRemove(true, jest.fn()));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
