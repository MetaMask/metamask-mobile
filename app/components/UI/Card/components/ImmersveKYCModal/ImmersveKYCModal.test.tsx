import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  AccessibilityInfo,
  AppState,
  Linking,
  Platform,
  type AppStateStatus,
} from 'react-native';
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
const mockExitCardFlow = jest.fn();
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
const mockCheckMultiple = jest.fn();
const mockGetCameraPermissionStatus = jest.fn((): string => 'granted');
const mockGetMicrophonePermissionStatus = jest.fn((): string => 'granted');
const mockRequestCameraPermission = jest.fn(() => Promise.resolve('granted'));
const mockRequestMicrophonePermission = jest.fn(() =>
  Promise.resolve('granted'),
);
let mockAppStateChange: ((state: AppStateStatus) => void) | undefined;

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
  const {
    Text: RNText,
    TouchableOpacity,
    View,
  } = jest.requireActual('react-native');
  return {
    // The glass header's ButtonIconGlass reads this enum at module load.
    ButtonIconSize: jest.requireActual('@metamask/design-system-react-native')
      .ButtonIconSize,
    Box: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>): React.ReactElement =>
      ActualReact.createElement(View, { testID }, children),
    BoxAlignItems: { Center: 'Center' },
    BoxJustifyContent: { Center: 'Center' },
    Text: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ActualReact.createElement(RNText, { testID }, children),
    TitleStandard: ({
      title,
      bottomLabel,
      titleProps,
      bottomLabelProps,
      topAccessory,
    }: {
      title?: string;
      bottomLabel?: string;
      titleProps?: { testID?: string };
      bottomLabelProps?: { testID?: string };
      topAccessory?: React.ReactNode;
    }): React.ReactElement =>
      ActualReact.createElement(
        View,
        null,
        topAccessory,
        ActualReact.createElement(
          RNText,
          { testID: titleProps?.testID },
          title,
        ),
        ActualReact.createElement(
          RNText,
          { testID: bottomLabelProps?.testID },
          bottomLabel,
        ),
      ),
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
    ButtonSize: { Md: 'Md', Lg: 'Lg' },
    TextVariant: { BodyMd: 'BodyMd' },
    TextColor: { TextAlternative: 'TextAlternative' },
    IconSize: { Xl: 'Xl' },
    Spinner: () => null,
  };
});

jest.mock('../Onboarding/ImmersveVerifyingIdentityAnimation', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (): React.ReactElement =>
      ActualReact.createElement(View, {
        testID: 'immersve-verifying-identity-animation',
      }),
  };
});

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotion: (): boolean => true,
}));

jest.mock('../../hooks/useExitCardFlow', () => ({
  useExitCardFlow: (): jest.Mock => mockExitCardFlow,
}));

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
  checkMultiple: (...args: unknown[]) => mockCheckMultiple(...args),
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getCameraPermissionStatus: () => mockGetCameraPermissionStatus(),
    getMicrophonePermissionStatus: () => mockGetMicrophonePermissionStatus(),
    requestCameraPermission: () => mockRequestCameraPermission(),
    requestMicrophonePermission: () => mockRequestMicrophonePermission(),
  },
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
  // Read the Jest mock directly. Calling useAnalytics() here is not a component
  // or a hook, so react-hooks/rules-of-hooks rejects it.
  const createEventBuilder = jest
    .mocked(useAnalytics)
    .getMockImplementation()?.().createEventBuilder;

  return (
    (createEventBuilder as jest.Mock | undefined)?.mock.results.flatMap(
      (result) => {
        const addProperties = result.value?.addProperties as
          | jest.Mock
          | undefined;
        return addProperties?.mock.calls.map((call) => call[0]) ?? [];
      },
    ) ?? []
  );
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
    mockCheckMultiple.mockResolvedValue(grantedStatuses);
    mockGetCameraPermissionStatus.mockReturnValue('granted');
    mockGetMicrophonePermissionStatus.mockReturnValue('granted');
    mockRequestCameraPermission.mockResolvedValue('granted');
    mockRequestMicrophonePermission.mockResolvedValue('granted');
    mockAppStateChange = undefined;
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation((): void => undefined);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((type, handler) => {
        if (type === 'change') {
          mockAppStateChange = handler as (state: AppStateStatus) => void;
        }
        return { remove: jest.fn() };
      });
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

  it('checks camera and microphone on iOS before showing the WebView', async () => {
    Platform.OS = 'ios';

    const { getByTestId } = render(<ImmersveKYCModal />);

    expect(mockRequestMultiple).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });
    expect(mockGetCameraPermissionStatus).toHaveBeenCalled();
    expect(mockGetMicrophonePermissionStatus).toHaveBeenCalled();
    expect(mockRequestCameraPermission).not.toHaveBeenCalled();
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

  it('prompts for camera and microphone on iOS when they are not determined', async () => {
    Platform.OS = 'ios';
    mockGetCameraPermissionStatus.mockReturnValue('not-determined');
    mockGetMicrophonePermissionStatus.mockReturnValue('not-determined');

    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });

    expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
    expect(mockRequestMicrophonePermission).toHaveBeenCalledTimes(1);
  });

  it('offers settings on iOS when camera access is denied, and continues once it is granted', async () => {
    Platform.OS = 'ios';
    mockGetCameraPermissionStatus
      .mockReturnValueOnce('denied')
      .mockReturnValueOnce('granted');
    mockGetMicrophonePermissionStatus
      .mockReturnValueOnce('granted')
      .mockReturnValueOnce('granted');
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);

    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-open-settings-button')).toBeTruthy();
    });
    expect(queryByTestId('immersve-kyc-webview')).toBeNull();
    expect(mockRequestCameraPermission).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('immersve-kyc-open-settings-button'));
    expect(openSettingsSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockAppStateChange?.('background');
      mockAppStateChange?.('active');
    });

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });
  });

  it('shows a permission error and does not mount the WebView when denied', async () => {
    mockRequestMultiple.mockResolvedValue(deniedStatuses);

    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    });

    expect(queryByTestId('immersve-kyc-webview')).toBeNull();
    expect(getByTestId('onboarding-title').props.children).toBe(
      'card.card_onboarding.immersve_kyc_modal.permission_title',
    );
    expect(getByTestId('immersve-kyc-error-illustration')).toBeTruthy();
    expect(getByTestId('immersve-kyc-error-text').props.children).toBe(
      'card.card_onboarding.immersve_kyc_modal.permission_error',
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'card.card_onboarding.immersve_kyc_modal.permission_title. card.card_onboarding.immersve_kyc_modal.permission_error',
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

  it('offers settings when the OS will not prompt again, without opening them yet', async () => {
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    mockRequestMultiple.mockResolvedValue(blockedStatuses);

    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-open-settings-button')).toBeTruthy();
    });

    expect(queryByTestId('immersve-kyc-webview')).toBeNull();
    expect(openSettingsSpy).not.toHaveBeenCalled();
    expect(getByTestId('onboarding-title').props.children).toBe(
      'card.card_onboarding.immersve_kyc_modal.permission_title',
    );
    expect(getByTestId('immersve-kyc-error-illustration')).toBeTruthy();
    expect(getByTestId('immersve-kyc-error-text').props.children).toBe(
      'card.card_onboarding.immersve_kyc_modal.permission_settings_description',
    );
    expect(
      getByTestId('immersve-kyc-open-settings-button').props.children,
    ).toContain('card.card_onboarding.immersve_kyc_modal.open_settings');

    fireEvent.press(getByTestId('immersve-kyc-open-settings-button'));

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    expect(mockRequestMultiple).toHaveBeenCalledTimes(1);
    openSettingsSpy.mockRestore();
  });

  it('loads the webview when access is granted in settings', async () => {
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    mockRequestMultiple.mockResolvedValue(blockedStatuses);
    mockCheckMultiple.mockResolvedValue(grantedStatuses);

    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-open-settings-button')).toBeTruthy();
    });

    await act(async () => {
      mockAppStateChange?.('background');
      mockAppStateChange?.('active');
    });

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });

    expect(mockCheckMultiple).toHaveBeenCalledWith([
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
    ]);
    expect(queryByTestId('immersve-kyc-open-settings-button')).toBeNull();
    expect(openSettingsSpy).not.toHaveBeenCalled();
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

  it.each(['NotAllowedError', 'SecurityError'])(
    'treats a %s from getUserMedia as a permission denial and asks for a fresh link',
    async (message) => {
      const onClose = jest.fn();
      setImmersveKycOnClose(onClose);
      const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

      await waitFor(() => {
        expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
      });

      await act(async () => {
        capturedProps.onMessage?.({
          nativeEvent: {
            data: JSON.stringify({
              type: 'immersve-kyc-error',
              source: 'getUserMedia',
              message,
              host: 'verify.immersve.com',
            }),
          },
        });
      });

      expect(getByTestId('immersve-kyc-error-text').props.children).toBe(
        'card.card_onboarding.immersve_kyc_modal.permission_error',
      );
      expect(queryByTestId('immersve-kyc-webview')).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              method: 'handleMessage',
              source: 'getUserMedia',
              message,
              pageHost: 'verify.immersve.com',
            }),
          }),
        }),
      );

      fireEvent.press(getByTestId('immersve-kyc-retry-button'));

      expect(onClose).toHaveBeenCalledWith(false, { reopen: true });
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(queryByTestId('immersve-kyc-webview')).toBeNull();
      expect(mockRequestMultiple).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps a non-permission getUserMedia failure on the load error and still asks for a fresh link', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    const { getByTestId, queryByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-webview')).toBeTruthy();
    });

    await act(async () => {
      capturedProps.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            type: 'immersve-kyc-error',
            source: 'getUserMedia',
            message: 'NotFoundError',
            host: 'verify.immersve.com',
          }),
        },
      });
    });

    expect(getByTestId('onboarding-title').props.children).toBe(
      'card.card_onboarding.immersve_kyc_modal.load_error_title',
    );
    expect(getByTestId('immersve-kyc-error-illustration')).toBeTruthy();
    expect(getByTestId('immersve-kyc-error-text').props.children).toBe(
      'card.card_onboarding.immersve_kyc_modal.load_error',
    );

    fireEvent.press(getByTestId('immersve-kyc-retry-button'));

    expect(onClose).toHaveBeenCalledWith(false, { reopen: true });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(queryByTestId('immersve-kyc-webview')).toBeNull();
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

  it('leaves card setup from a permission error instead of returning to processing', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    mockRequestMultiple.mockResolvedValue(deniedStatuses);
    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    });

    fireEvent.press(getByTestId('immersve-kyc-close-button'));

    expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(getTrackedProperties()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: CardActions.KYC_WEBVIEW_CLOSE }),
      ]),
    );
  });

  it('leaves card setup from a load error instead of returning to processing', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(capturedProps.onHttpError).toBeDefined();
    });

    await act(async () => {
      capturedProps.onHttpError?.({ nativeEvent: { statusCode: 502 } });
    });

    fireEvent.press(getByTestId('immersve-kyc-close-button'));

    expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(getTrackedProperties()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: CardActions.KYC_WEBVIEW_CLOSE }),
      ]),
    );
  });

  it('leaves card setup when back is pressed on a permission error, and ignores the exit pop', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    mockRequestMultiple.mockResolvedValue(deniedStatuses);
    const { getByTestId } = render(<ImmersveKYCModal />);

    await waitFor(() => {
      expect(getByTestId('immersve-kyc-error-container')).toBeTruthy();
    });

    const preventDefault = jest.fn();
    getBeforeRemoveListener()({
      preventDefault,
      data: { action: { type: 'GO_BACK' } },
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();

    const exitPopPreventDefault = jest.fn();
    getBeforeRemoveListener()({
      preventDefault: exitPopPreventDefault,
      data: { action: { type: 'GO_BACK' } },
    });

    expect(exitPopPreventDefault).not.toHaveBeenCalled();
    expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
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
    expect(onClose).toHaveBeenCalledWith(false);
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
    async (type) => {
      const onClose = jest.fn();
      setImmersveKycOnClose(onClose);
      render(<ImmersveKYCModal />);
      await act(async () => {
        await Promise.resolve();
      });
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
      expect(onClose).toHaveBeenCalledWith(false);
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getTrackedProperties()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: CardActions.KYC_WEBVIEW_CLOSE }),
        ]),
      );
    },
  );

  it('lets a programmatic reset remove the screen without a re-poll', async () => {
    const onClose = jest.fn();
    setImmersveKycOnClose(onClose);
    render(<ImmersveKYCModal />);
    await act(async () => {
      await Promise.resolve();
    });
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
    expect(onClose).toHaveBeenCalledWith(true);
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
    expect(onClose).toHaveBeenCalledWith(true);
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
