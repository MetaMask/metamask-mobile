import { renderHook, act } from '@testing-library/react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import Logger from '../../../../util/Logger';
import { AppState, type AppStateStatus } from 'react-native';
import {
  useOpenProviderSupportUrl,
  type OpenProviderSupportUrlOptions,
} from './useOpenProviderSupportUrl';

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

type AppStateListener = (state: AppStateStatus) => void;
let mockAppStateListener: AppStateListener | undefined;
const originalCurrentState = Object.getOwnPropertyDescriptor(
  AppState,
  'currentState',
);

function setup(): {
  openSupportUrl: (
    url: string,
    options?: OpenProviderSupportUrlOptions,
  ) => Promise<void>;
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
    mockAppStateListener = undefined;
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, listener) => {
        mockAppStateListener = listener as AppStateListener;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCurrentState) {
      Object.defineProperty(AppState, 'currentState', originalCurrentState);
    }
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

    await act(() => openSupportUrl(SUPPORT_URL, { title: 'Provider' }));

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

  it('calls onOpen once per accepted press and not for ignored repeat presses', async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockOpen.mockReturnValue(new Promise(() => undefined));
    const onOpen = jest.fn();
    const { openSupportUrl } = setup();

    await act(async () => {
      openSupportUrl(SUPPORT_URL, { onOpen });
    });
    await act(() => openSupportUrl(SUPPORT_URL, { onOpen }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('accepts a new press after the app returns to the foreground while a browser call never settled', async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockOpen.mockReturnValueOnce(new Promise(() => undefined));
    mockOpen.mockResolvedValueOnce({ type: 'cancel' });
    const { openSupportUrl, onCloseBottomSheet } = setup();

    await act(async () => {
      openSupportUrl(SUPPORT_URL);
    });
    await act(() => openSupportUrl(SUPPORT_URL));
    expect(mockOpen).toHaveBeenCalledTimes(1);

    act(() => {
      mockAppStateListener?.('background');
      mockAppStateListener?.('active');
    });
    await act(() => openSupportUrl(SUPPORT_URL));

    expect(mockOpen).toHaveBeenCalledTimes(2);
    expect(onCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('does not reset the guard when the app stays active', async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockOpen.mockReturnValue(new Promise(() => undefined));
    const { openSupportUrl } = setup();

    await act(async () => {
      openSupportUrl(SUPPORT_URL);
    });
    act(() => {
      mockAppStateListener?.('active');
    });
    await act(() => openSupportUrl(SUPPORT_URL));

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });
});
