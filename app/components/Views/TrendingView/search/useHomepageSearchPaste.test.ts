import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useABTest } from '../../../../hooks/useABTest';
import ClipboardManager from '../../../../core/ClipboardManager';
import { trackHomepageSearchPaste } from '../../../../util/analytics/homepageSearchPasteTracking';
import {
  isNewHomepageClipboardRevision,
  resetHomepageSearchPasteStateForTests,
  useHomepageSearchPaste,
} from './useHomepageSearchPaste';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

jest.mock('../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    getRevision: jest.fn(() => 1),
    getString: jest.fn(),
    hasString: jest.fn(),
  },
}));

jest.mock('../../../../util/analytics/homepageSearchPasteTracking', () => ({
  trackHomepageSearchPaste: jest.fn(),
}));

const mockUseABTest = useABTest as jest.MockedFunction<typeof useABTest>;
const mockClipboardManager = ClipboardManager as jest.Mocked<
  typeof ClipboardManager
>;
const activeClipboardListeners = new Set<() => void>();
let mockClipboardRevision = 10;

describe('isNewHomepageClipboardRevision', () => {
  it('accepts clipboard content when the native clipboard has a string', () => {
    expect(isNewHomepageClipboardRevision(true, 1)).toBe(true);
  });

  it('rejects empty clipboard content', () => {
    expect(isNewHomepageClipboardRevision(false, 1)).toBe(false);
  });
});

describe('useHomepageSearchPaste', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeClipboardListeners.clear();
    mockClipboardRevision += 1;
    mockUseABTest.mockReturnValue({
      variant: { showHomepageSearchBar: true },
      variantName: 'control',
      isActive: true,
    });
    mockClipboardManager.hasString.mockResolvedValue(true);
    mockClipboardManager.getString.mockResolvedValue('0xabc');
    mockClipboardManager.getRevision.mockReturnValue(mockClipboardRevision);
    mockClipboardManager.addListener.mockImplementation((listener) => {
      if (listener) {
        activeClipboardListeners.add(listener);
      }
      return {
        remove: () => {
          if (listener) {
            activeClipboardListeners.delete(listener);
          }
        },
      } as ReturnType<typeof ClipboardManager.addListener>;
    });
  });

  it('shows Paste after a successful clipboard presence check', async () => {
    const { result } = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );

    await waitFor(() => {
      expect(result.current.showPastePill).toBe(true);
    });
  });

  it('preserves an initially visible Paste pill during the first check', () => {
    const { result } = renderHook(() =>
      useHomepageSearchPaste({
        enabled: true,
        initiallyAvailable: true,
        onPaste: jest.fn(),
      }),
    );

    expect(result.current.showPastePill).toBe(true);
  });

  it('does not read or show Paste when disabled', async () => {
    const { result } = renderHook(() =>
      useHomepageSearchPaste({ enabled: false, onPaste: jest.fn() }),
    );

    await waitFor(() => {
      expect(result.current.showPastePill).toBe(false);
    });
    expect(mockClipboardManager.hasString).not.toHaveBeenCalled();
  });

  it('does not read or show Paste when the search header is disabled', async () => {
    mockUseABTest.mockReturnValue({
      variant: { showHomepageSearchBar: false },
      variantName: 'treatment',
      isActive: true,
    });

    const { result } = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );

    await waitFor(() => {
      expect(result.current.isSearchHeaderEnabled).toBe(false);
      expect(result.current.showPastePill).toBe(false);
    });
    expect(mockClipboardManager.hasString).not.toHaveBeenCalled();
  });

  it('consumes the clipboard value and forwards it on paste', async () => {
    const onPaste = jest.fn();
    const { result } = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste }),
    );

    await waitFor(() => {
      expect(result.current.showPastePill).toBe(true);
    });

    await act(async () => {
      await result.current.handlePastePress();
    });

    expect(onPaste).toHaveBeenCalledWith('0xabc', undefined);
    expect(trackHomepageSearchPaste).toHaveBeenCalledWith();
    expect(result.current.showPastePill).toBe(false);
  });

  it('hides Paste when reading clipboard content fails', async () => {
    mockClipboardManager.getString.mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );

    await act(async () => {
      await result.current.handlePastePress();
    });

    expect(result.current.showPastePill).toBe(false);
  });

  it('hides Paste in all hook instances after it is consumed', async () => {
    const first = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );
    const second = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );

    await waitFor(() => {
      expect(first.result.current.showPastePill).toBe(true);
      expect(second.result.current.showPastePill).toBe(true);
    });

    await act(async () => {
      await first.result.current.handlePastePress();
    });

    expect(first.result.current.showPastePill).toBe(false);
    expect(second.result.current.showPastePill).toBe(false);
  });

  it('shows Paste again after the clipboard changes', async () => {
    const { result } = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );

    await waitFor(() => {
      expect(result.current.showPastePill).toBe(true);
    });

    await act(async () => {
      await result.current.handlePastePress();
    });

    expect(result.current.showPastePill).toBe(false);

    mockClipboardRevision += 1;
    mockClipboardManager.getRevision.mockReturnValue(mockClipboardRevision);

    act(() => {
      activeClipboardListeners.forEach((listener) => listener());
    });

    await waitFor(() => {
      expect(result.current.showPastePill).toBe(true);
    });
  });

  it('hides Paste without forwarding an empty clipboard value', async () => {
    mockClipboardManager.getString.mockResolvedValue('   ');
    const onPaste = jest.fn();
    const { result } = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste }),
    );

    await waitFor(() => {
      expect(result.current.showPastePill).toBe(true);
    });

    await act(async () => {
      await result.current.handlePastePress();
    });

    expect(onPaste).not.toHaveBeenCalled();
    expect(trackHomepageSearchPaste).not.toHaveBeenCalled();
    expect(result.current.showPastePill).toBe(false);
  });

  it('shows Paste again for the same clipboard revision after test state is reset', async () => {
    const first = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );

    await waitFor(() => {
      expect(first.result.current.showPastePill).toBe(true);
    });

    await act(async () => {
      await first.result.current.handlePastePress();
    });

    expect(first.result.current.showPastePill).toBe(false);

    resetHomepageSearchPasteStateForTests();

    const second = renderHook(() =>
      useHomepageSearchPaste({ enabled: true, onPaste: jest.fn() }),
    );

    await waitFor(() => {
      expect(second.result.current.showPastePill).toBe(true);
    });
  });
});
