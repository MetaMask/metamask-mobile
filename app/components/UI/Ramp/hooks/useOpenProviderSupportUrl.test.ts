import { renderHook, act } from '@testing-library/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import Logger from '../../../../util/Logger';
import { useOpenProviderSupportUrl } from './useOpenProviderSupportUrl';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(),
  open: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const SUPPORT_URL = 'https://support.example.com';

const mockIsAvailable = InAppBrowser.isAvailable as jest.Mock;
const mockOpen = InAppBrowser.open as jest.Mock;

function setup(): {
  openSupportUrl: (url: string, title?: string) => Promise<void>;
  onCloseBottomSheet: jest.Mock;
} {
  const onCloseBottomSheet = jest.fn();
  const sheetRef = {
    current: { onCloseBottomSheet } as unknown as BottomSheetRef,
  };
  const { result } = renderHook(() =>
    useOpenProviderSupportUrl({ sheetRef, logContext: 'TestModal' }),
  );
  return { openSupportUrl: result.current, onCloseBottomSheet };
}

describe('useOpenProviderSupportUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the in-app browser before closing the sheet', async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockOpen.mockResolvedValue({ type: 'cancel' });
    const { openSupportUrl, onCloseBottomSheet } = setup();

    await act(() => openSupportUrl(SUPPORT_URL));

    expect(mockOpen).toHaveBeenCalledWith(SUPPORT_URL);
    expect(onCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockOpen.mock.invocationCallOrder[0]).toBeLessThan(
      onCloseBottomSheet.mock.invocationCallOrder[0],
    );
  });

  it('keeps the sheet open until the in-app browser is dismissed', async () => {
    mockIsAvailable.mockResolvedValue(true);
    let dismissBrowser: () => void = () => undefined;
    mockOpen.mockReturnValue(
      new Promise((resolve) => {
        dismissBrowser = (): void => resolve({ type: 'cancel' });
      }),
    );
    const { openSupportUrl, onCloseBottomSheet } = setup();

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = openSupportUrl(SUPPORT_URL);
    });

    expect(mockOpen).toHaveBeenCalledWith(SUPPORT_URL);
    expect(onCloseBottomSheet).not.toHaveBeenCalled();

    await act(async () => {
      dismissBrowser();
      await pending;
    });

    expect(onCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet and logs when the in-app browser fails to open', async () => {
    const error = new Error('open failed');
    mockIsAvailable.mockResolvedValue(true);
    mockOpen.mockRejectedValue(error);
    const { openSupportUrl, onCloseBottomSheet } = setup();

    await act(() => openSupportUrl(SUPPORT_URL));

    expect(onCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'TestModal: Failed to open support URL',
    );
  });

  it('ignores a second press while the in-app browser is opening', async () => {
    mockIsAvailable.mockResolvedValue(true);
    let dismissBrowser: () => void = () => undefined;
    mockOpen.mockReturnValue(
      new Promise((resolve) => {
        dismissBrowser = (): void => resolve({ type: 'cancel' });
      }),
    );
    const { openSupportUrl, onCloseBottomSheet } = setup();

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = openSupportUrl(SUPPORT_URL);
    });
    await act(() => openSupportUrl(SUPPORT_URL));

    expect(mockIsAvailable).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(onCloseBottomSheet).not.toHaveBeenCalled();

    await act(async () => {
      dismissBrowser();
      await pending;
    });

    expect(onCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('allows opening again after the in-app browser is dismissed', async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockOpen.mockResolvedValue({ type: 'cancel' });
    const { openSupportUrl } = setup();

    await act(() => openSupportUrl(SUPPORT_URL));
    await act(() => openSupportUrl(SUPPORT_URL));

    expect(mockOpen).toHaveBeenCalledTimes(2);
  });

  it('navigates to the Webview without closing the sheet when the in-app browser is unavailable', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { openSupportUrl, onCloseBottomSheet } = setup();

    await act(() => openSupportUrl(SUPPORT_URL, 'Provider'));

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: SUPPORT_URL, title: 'Provider' },
    });
    expect(mockOpen).not.toHaveBeenCalled();
    expect(onCloseBottomSheet).not.toHaveBeenCalled();
  });

  it('logs when checking in-app browser availability fails', async () => {
    const error = new Error('unavailable');
    mockIsAvailable.mockRejectedValue(error);
    const { openSupportUrl, onCloseBottomSheet } = setup();

    await act(() => openSupportUrl(SUPPORT_URL));

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'TestModal: Failed to open support URL',
    );
    expect(onCloseBottomSheet).not.toHaveBeenCalled();
  });
});
