import { renderHook, act } from '@testing-library/react-hooks';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import useCopyClipboard from './useCopyClipboard';
import ClipboardManager from '../../../../../core/ClipboardManager';

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

const mockToast = jest.mocked(toast);

describe('useCopyClipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('copies provided value to system clipboard', async () => {
    const { result } = renderHook(() => useCopyClipboard());
    const testAddress = '0x1234567890abcdef';

    await act(async () => {
      await result.current(testAddress);
    });

    expect(ClipboardManager.setString).toHaveBeenCalledWith(testAddress);
  });

  it('shows success toast after copying', async () => {
    const { result } = renderHook(() => useCopyClipboard());

    await act(async () => {
      await result.current('0x1234567890abcdef');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
      }),
    );
  });

  it('uses custom alert text in toast when provided', async () => {
    const { result } = renderHook(() => useCopyClipboard());
    const customMessage = 'Transaction ID copied';

    await act(async () => {
      await result.current('0x1234', customMessage);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: customMessage,
      }),
    );
  });

  it('skips clipboard and toast when value is empty string', async () => {
    const { result } = renderHook(() => useCopyClipboard());

    await act(async () => {
      await result.current('');
    });

    expect(ClipboardManager.setString).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('dispatches protectWalletModalVisible after 2 second delay', async () => {
    const { result } = renderHook(() => useCopyClipboard());

    await act(async () => {
      await result.current('0x1234');
    });

    expect(mockDispatch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockDispatch).toHaveBeenCalled();
  });
});
