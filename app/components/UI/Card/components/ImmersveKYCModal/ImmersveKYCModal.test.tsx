import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { RESULTS } from 'react-native-permissions';
import Logger from '../../../../../util/Logger';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { CardActions } from '../../util/metrics';
import ImmersveKYCModal, {
  IMMERSVE_KYC_LOAD_TIMEOUT_MS,
  setImmersveKycOnClose,
  clearImmersveKycOnClose,
} from './ImmersveKYCModal';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockAddListener = jest.fn(
  (
    _eventName: string,
    _listener: (event: {
      preventDefault: () => void;
      data: { action: { type: string } };
    }) => void,
  ) => jest.fn(),
);
const mockRequestMultiple = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    addListener: mockAddListener,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    url: 'https://verify.immersve.com/session',
    redirectUrl: 'https://metamask.io/card/kyc-complete',
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ActualReact = jest.requireActual('react');
  const { Text: RNText, TouchableOpacity } = jest.requireActual('react-native');
  return {
    // The glass header's ButtonIconGlass reads this enum at module load.
    ButtonIconSize: jest.requireActual('@metamask/design-system-react-native')
      .ButtonIconSize,
    Text: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ActualReact.createElement(RNText, { testID }, children),
    Button: ({
      children,
      onPress,
      testID,
    }: React.PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress, testID },
        children,
      ),
    HeaderStandard: ({
      onClose,
      closeButtonProps,
      title,
    }: {
      onClose?: () => void;
      closeButtonProps?: { testID?: string };
      title?: React.ReactNode;
    }) =>
      ActualReact.createElement(
        TouchableOpacity,
        { onPress: onClose, testID: closeButtonProps?.testID },
        title,
        'Close',
      ),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Md: 'Md' },
    TextVariant: { BodyMd: 'BodyMd' },
    IconSize: { Xl: 'Xl' },
    Spinner: () => null,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      CAMERA: 'android.permission.CAMERA',
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    },
    IOS: {
      CAMERA: 'ios.permission.CAMERA',
      MICROPHONE: 'ios.permission.MICROPHONE',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
    LIMITED: 'limited',
  },
  requestMultiple: (...args: unknown[]) => mockRequestMultiple(...args),
}));

let capturedProps: {
  onNavigationStateChange?: (s: { url: string }) => void;
  onError?: (e?: { nativeEvent?: { statusCode?: number } }) => void;
  onHttpError?: (e?: { nativeEvent?: { statusCode?: number } }) => void;
  onMessage?: (e: { nativeEvent: { data: string } }) => void;
  onLoadStart?: () => void;
  onLoadEnd?: (e: { nativeEvent: { loading: boolean } }) => void;
  mediaPlaybackRequiresUserGesture?: boolean;
  injectedJavaScript?: string;
  injectedJavaScriptBeforeContentLoaded?: string;
} = {};

jest.mock('@metamask/react-native-webview', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: (props: typeof capturedProps & { testID?: string }) => {
      capturedProps = props;
      return ActualReact.createElement(View, { testID: props.testID });
    },
  };
});

const grantedStatuses = {
  'android.permission.CAMERA': RESULTS.GRANTED,
  'android.permission.RECORD_AUDIO': RESULTS.GRANTED,
};

const deniedStatuses = {
  'android.permission.CAMERA': RESULTS.DENIED,
  'android.permission.RECORD_AUDIO': RESULTS.DENIED,
};

const blockedStatuses = {
  'android.permission.CAMERA': RESULTS.BLOCKED,
  'android.permission.RECORD_AUDIO': RESULTS.GRANTED,
};

const getTrackedProperties = () => {
  const { createEventBuilder } = useAnalytics();
  return (createEventBuilder as jest.Mock).mock.results.flatMap((result) => {
    const addProperties = result.value?.addProperties as jest.Mock | undefined;
    return addProperties?.mock.calls.map((call) => call[0]) ?? [];
  });
};

const getBeforeRemoveListener = () => {
  const listenerCall = mockAddListener.mock.calls.find(
    (call) => call[0] === 'beforeRemove',
  );
  if (!listenerCall) {
    throw new Error('beforeRemove listener was not registered');
  }
  return listenerCall[1];
};

describe('ImmersveKYCModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    capturedProps = {};
    clearImmersveKycOnClose();
    Platform.OS = 'android';
    mockRequestMultiple.mockResolvedValue(grantedStatuses);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('requests camera and microphone permissions before showing the WebView', async () => {
    const { queryByTestId, getByTestId } = render(<ImmersveKYCModal />);

    expect(queryByTestId('immersve-kyc-webview')).toBeNull();

    await waitFor(() => {
      expect(mockRequestMultiple).toHaveBeenCalledWith([
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
      ]);
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });

    expect(capturedProps.mediaPlaybackRequiresUserGesture).toBe(false);
    expect(capturedProps.injectedJavaScript).toContain('getUserMedia');
    expect(capturedProps.injectedJavaScriptBeforeContentLoaded).toContain(
      'session-progress-header',
    );
    expect(capturedProps.injectedJavaScriptBeforeContentLoaded).toContain(
      'data-test="exit"',
    );
    expect(capturedProps.injectedJavaScriptBeforeContentLoaded).toContain(
      '.logo',
    );
    expect(getByTestId('immersve-kyc-header-logo')).toBeTruthy();
  });

  it('renders the WebView on iOS without requesting permissions, hiding Immersve chrome', () => {
    Platform.OS = 'ios';

    const { getByTestId } = render(<ImmersveKYCModal />);

    expect(mockRequestMultiple).not.toHaveBeenCalled();
    expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    expect(capturedProps.injectedJavaScript).toBeUndefined();
    expect(capturedProps.injectedJavaScriptBeforeContentLoaded).toContain(
      'session-progress-header',
    );
    expect(capturedProps.injectedJavaScriptBeforeContentLoaded).toContain(
      'data-test="exit"',
    );
    expect(capturedProps.injectedJavaScriptBeforeContentLoaded).toContain(
      '.logo',
    );
    expect(getByTestId('immersve-kyc-header-logo')).toBeTruthy();
  });

  it('shows a permission error and does not mount the WebView when denied', async () => {
    mockRequestMultiple.mockResolvedValue(deniedStatuses);

    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    });

    expect(queryByTestId('immersve-kyc-webview')).toBeNull();
    expect(getByTestId('immersve-kyc-error-text').props.children).toBe(
      'card.card_onboarding.immersve_kyc_modal.permission_error',
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { feature: 'card', provider: 'immersve' },
        context: expect.objectContaining({
          name: 'ImmersveKYCModal',
          data: expect.objectContaining({
            method: 'requestMediaPermissions',
          }),
        }),
      }),
    );
  });

  it('re-requests permissions when retry is pressed after a denial', async () => {
    mockRequestMultiple
      .mockResolvedValueOnce(deniedStatuses)
      .mockResolvedValueOnce(grantedStatuses);

    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-retry-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('immersve-kyc-retry-button'));

    await waitFor(() => {
      expect(mockRequestMultiple).toHaveBeenCalledTimes(2);
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });
  });

  it('opens settings on retry while the permission is still blocked', async () => {
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    mockRequestMultiple.mockResolvedValue(blockedStatuses);

    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-retry-button')).toBeTruthy();
    });

    // Not on the first failure — only once the user asks to try again.
    expect(openSettingsSpy).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('immersve-kyc-retry-button'));

    await waitFor(() => {
      expect(openSettingsSpy).toHaveBeenCalled();
    });

    openSettingsSpy.mockRestore();
  });

  it('does not open settings on retry once the permission has been granted', async () => {
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    mockRequestMultiple
      .mockResolvedValueOnce(blockedStatuses)
      .mockResolvedValueOnce(grantedStatuses);

    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-retry-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('immersve-kyc-retry-button'));

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });

    expect(openSettingsSpy).not.toHaveBeenCalled();
    openSettingsSpy.mockRestore();
  });

  it('keeps the WebView mounted and logs when the page reports a non-camera error', async () => {
    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });

    await act(async () => {
      capturedProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            type: 'immersve-kyc-error',
            source: 'window.onerror',
            message: 'ResizeObserver loop limit exceeded',
            host: 'verify.immersve.com',
          }),
        },
      });
    });

    expect(queryByTestId('immersve-kyc-error-container')).toBeNull();
    expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          data: expect.objectContaining({
            method: 'handleMessage',
            source: 'window.onerror',
            message: 'ResizeObserver loop limit exceeded',
          }),
        }),
      }),
    );
  });

  it('shows an error and logs when the page reports a getUserMedia failure', async () => {
    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });

    await act(async () => {
      capturedProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            type: 'immersve-kyc-error',
            source: 'getUserMedia',
            message: 'NotAllowedError',
            host: 'verify.immersve.com',
          }),
        },
      });
    });

    expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          data: expect.objectContaining({
            method: 'handleMessage',
            source: 'getUserMedia',
            message: 'NotAllowedError',
            pageHost: 'verify.immersve.com',
          }),
        }),
      }),
    );
  });

  it('shows an error when the document load times out', async () => {
    // No waitFor inside the fake-timer window: waitFor advances Jest timers
    // itself, which would consume the component's own load timeout and let this
    // test pass without the explicit advance below.
    jest.useFakeTimers();
    mockRequestMultiple.mockResolvedValue(grantedStatuses);

    const { getByTestId } = render(<ImmersveKYCModal />);

    // Flushes the permission promise chain and its effects.
    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('immersve-kyc-webview')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(IMMERSVE_KYC_LOAD_TIMEOUT_MS);
    });

    expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          data: expect.objectContaining({
            method: 'loadTimeout',
          }),
        }),
      }),
    );
  });

  it('still times out when onLoadEnd fires mid redirect chain', async () => {
    jest.useFakeTimers();
    mockRequestMultiple.mockResolvedValue(grantedStatuses);

    const { getByTestId } = render(<ImmersveKYCModal />);

    await act(async () => {
      await Promise.resolve();
    });

    // Android reports onLoadEnd per redirect hop while still loading.
    await act(async () => {
      capturedProps.onLoadEnd?.({ nativeEvent: { loading: true } });
    });

    await act(async () => {
      jest.advanceTimersByTime(IMMERSVE_KYC_LOAD_TIMEOUT_MS);
    });

    expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          data: expect.objectContaining({ method: 'loadTimeout' }),
        }),
      }),
    );
  });

  it('keeps a loaded session running when the page navigates again', async () => {
    jest.useFakeTimers();
    mockRequestMultiple.mockResolvedValue(grantedStatuses);

    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await act(async () => {
      await Promise.resolve();
    });

    // First load completes, then Sumsub navigates within the flow.
    await act(async () => {
      capturedProps.onLoadEnd?.({ nativeEvent: { loading: false } });
      capturedProps.onLoadStart?.();
    });

    await act(async () => {
      jest.advanceTimersByTime(IMMERSVE_KYC_LOAD_TIMEOUT_MS * 2);
    });

    expect(queryByTestId('immersve-kyc-error-container')).toBeNull();
    expect(queryByTestId('immersve-kyc-loading')).toBeNull();
    expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
  });

  it('closes when the webview navigates to the redirect URL', async () => {
    render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(capturedProps.onNavigationStateChange).toBeDefined();
    });

    await act(async () => {
      capturedProps.onNavigationStateChange?.({
        url: 'https://metamask.io/card/kyc-complete?status=done',
      });
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not close on unrelated navigation', async () => {
    render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(capturedProps.onNavigationStateChange).toBeDefined();
    });

    await act(async () => {
      capturedProps.onNavigationStateChange?.({
        url: 'https://verify.immersve.com/step-2',
      });
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('returns to the processing screen when the close button is pressed', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-close-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('immersve-kyc-close-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(getTrackedProperties()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: CardActions.KYC_WEBVIEW_CLOSE }),
      ]),
    );
  });

  it.each(['GO_BACK', 'POP'])(
    're-polls once when %s removes the screen, without going back again',
    (type) => {
      const onClose = jest.fn();
      setImmersveKycOnClose(onClose);
      render(<ImmersveKYCModal />);
      const preventDefault = jest.fn();

      getBeforeRemoveListener()({
        preventDefault,
        data: { action: { type } },
      });
      getBeforeRemoveListener()({
        preventDefault,
        data: { action: { type } },
      });

      expect(preventDefault).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getTrackedProperties()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: CardActions.KYC_WEBVIEW_CLOSE }),
        ]),
      );
    },
  );

  it('lets a programmatic reset remove the screen without a re-poll', () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    render(<ImmersveKYCModal />);
    const preventDefault = jest.fn();

    getBeforeRemoveListener()({
      preventDefault,
      data: { action: { type: 'RESET' } },
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('lets a redirect close through and re-polls only once', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(capturedProps.onNavigationStateChange).toBeDefined();
    });

    await act(async () => {
      capturedProps.onNavigationStateChange?.({
        url: 'https://metamask.io/card/kyc-complete?status=done',
      });
    });
    const preventDefault = jest.fn();
    getBeforeRemoveListener()({
      preventDefault,
      data: { action: { type: 'GO_BACK' } },
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getTrackedProperties()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: CardActions.KYC_WEBVIEW_COMPLETED }),
      ]),
    );
  });

  it('fires the registered onClose callback on redirect close', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(capturedProps.onNavigationStateChange).toBeDefined();
    });

    await act(async () => {
      capturedProps.onNavigationStateChange?.({
        url: 'https://metamask.io/card/kyc-complete?status=done',
      });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('reports webview load errors to Sentry with host context', async () => {
    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(capturedProps.onHttpError).toBeDefined();
    });

    await act(async () => {
      capturedProps.onHttpError?.({ nativeEvent: { statusCode: 502 } });
    });
    expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { feature: 'card', provider: 'immersve' },
        context: expect.objectContaining({
          name: 'ImmersveKYCModal',
          data: expect.objectContaining({
            method: 'handleError',
            urlHost: 'verify.immersve.com',
            redirectHost: 'metamask.io',
            httpStatus: 502,
          }),
        }),
      }),
    );
  });

  it('dedupes onError and onHttpError for a single failure', async () => {
    render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(capturedProps.onError).toBeDefined();
    });

    await act(async () => {
      capturedProps.onError?.();
      capturedProps.onHttpError?.({ nativeEvent: { statusCode: 500 } });
    });
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });
});
