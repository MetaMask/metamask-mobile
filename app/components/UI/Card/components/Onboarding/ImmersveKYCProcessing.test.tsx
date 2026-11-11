import React from 'react';
import { StatusBar } from 'react-native';
import { act, render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ImmersveKYCProcessing, {
  IMMERSVE_KYC_RESULT_MIN_DWELL_MS,
  POLLING_TIMEOUT_MS,
} from './ImmersveKYCProcessing';
import { CompleteSelectors } from './Complete.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { KYC_REDIRECT_URL } from '../../constants';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import {
  deriveNextImmersveAction,
  type ImmersveNextAction,
} from '../../util/immersvePrerequisites';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: (effect: () => void) => effect(),
}));

const mockReduxDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'fs-1'),
  useDispatch: () => mockReduxDispatch,
}));

// Capture the onClose callback the screen registers on the KYC modal so tests
// can simulate the webview being closed.
let mockCapturedOnClose: (() => void) | null = null;
jest.mock('../ImmersveKYCModal/ImmersveKYCModal', () => ({
  setImmersveKycOnClose: (cb: () => void) => {
    mockCapturedOnClose = cb;
  },
  clearImmersveKycOnClose: () => {
    mockCapturedOnClose = null;
  },
}));

let mockParams: { countryKey?: string; kycUrl?: string } = {
  countryKey: 'GB',
};
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockParams,
}));

jest.mock('../../hooks/useImmersveSpendingPrerequisites');
jest.mock('../../hooks/useImmersveOnboardingRouter');

const mockExitCardFlow = jest.fn();
const mockNotifyKycRejected = jest.fn().mockResolvedValue(undefined);
const mockNotifyKycInReview = jest.fn();
const mockApproveFunding = jest.fn().mockResolvedValue(undefined);
let mockIsMoneyAccountCountry = false;

jest.mock('../../hooks/useExitCardFlow', () => ({
  useExitCardFlow: () => mockExitCardFlow,
}));

jest.mock('../../hooks/useImmersveKycOutcome', () => ({
  useImmersveKycOutcome: () => ({
    notifyKycRejected: (...args: unknown[]) => mockNotifyKycRejected(...args),
    notifyKycInReview: () => mockNotifyKycInReview(),
  }),
}));

jest.mock('../../hooks/useImmersveMoneyAccountFundingApproval', () => ({
  useImmersveMoneyAccountFundingApproval: () => ({
    approveFunding: (...args: unknown[]) => mockApproveFunding(...args),
  }),
}));

jest.mock('../../hooks/useImmersveFundingChannel', () => ({
  useIsImmersveMoneyAccountCountry: () => mockIsMoneyAccountCountry,
}));

const mockRefresh = jest.fn().mockResolvedValue(null);
const mockRoute = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({}));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotion: () => true,
  useReduceMotionState: () => true,
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((className?: string) => ({ className })),
  }),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/glassHeaders',
  () => ({
    selectGlassHeadersEnabled: jest.fn(() => false),
  }),
);

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: () => ({
    onClose: jest.fn(),
    closeButtonProps: { testID: 'card-header-close-button' },
  }),
}));

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        onClose,
        onBack,
        closeButtonProps,
        backButtonProps,
      }: {
        onClose?: () => void;
        onBack?: () => void;
        closeButtonProps?: { testID?: string };
        backButtonProps?: { testID?: string };
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header-standard-glass' },
          onClose
            ? ReactActual.createElement(TouchableOpacity, {
                testID: closeButtonProps?.testID,
                onPress: onClose,
              })
            : null,
          onBack
            ? ReactActual.createElement(TouchableOpacity, {
                testID: backButtonProps?.testID,
                onPress: onBack,
              })
            : null,
        ),
    };
  },
);

jest.mock('./ImmersveVerifyingIdentityAnimation', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'immersve-verifying-identity-animation',
      }),
  };
});

jest.mock('../../../MarketingMomentTitle', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID }, children),
  };
});

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/assets/vba-account-create-failure.svg',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        ReactActual.createElement(View, {
          testID: 'kyc-failed-vba-failure-svg',
        }),
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...p
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ReactActual.createElement(View, { testID, ...p }, children),
    BoxAlignItems: { Center: 'Center' },
    BoxJustifyContent: { Center: 'Center', End: 'End' },
    TextColor: {
      TextDefault: 'TextDefault',
      TextAlternative: 'TextAlternative',
      ErrorDefault: 'ErrorDefault',
    },
    FontWeight: { Medium: '500', Regular: '400' },
    Text: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(Text, p, children),
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
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'title-standard' },
        topAccessory,
        ReactActual.createElement(Text, { testID: titleProps?.testID }, title),
        ReactActual.createElement(
          Text,
          { testID: bottomLabelProps?.testID },
          bottomLabel,
        ),
      ),
    Button: ({
      children,
      onPress,
      testID,
    }: React.PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      ReactActual.createElement(
        TouchableOpacity,
        { onPress, testID },
        children,
      ),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Lg: 'Lg' },
    TextVariant: { BodyMd: 'BodyMd' },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const KYC_URL = 'https://verify.immersve.com/abc';
const IN_PROGRESS_TITLE =
  'card.card_onboarding.immersve_kyc_processing.in_progress_title';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockDispatch = jest.fn();

const setNextAction = (
  nextAction: ImmersveNextAction | null,
  error: string | null = null,
  isLoading = false,
) => {
  (useImmersveSpendingPrerequisites as jest.Mock).mockReturnValue({
    nextAction,
    refresh: mockRefresh,
    prerequisites: [],
    isLoading,
    error,
  });
};

const closeWebview = () => {
  act(() => {
    mockCapturedOnClose?.();
  });
};

const fundingAction: ImmersveNextAction = {
  type: 'funding',
  write: {
    abi: [],
    contractAddress: '0xusdc',
    method: 'approve',
    params: {},
  },
};

describe('ImmersveKYCProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockParams = { countryKey: 'GB' };
    mockIsMoneyAccountCountry = false;
    mockCapturedOnClose = null;
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
      dispatch: mockDispatch,
    });
    (useImmersveOnboardingRouter as jest.Mock).mockReturnValue(mockRoute);
    setNextAction(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('polls on mount and stays blank until there is something to show', () => {
    const setBarStyle = jest
      .spyOn(StatusBar, 'setBarStyle')
      .mockImplementation(() => undefined);
    const { getByTestId, queryByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockRefresh).toHaveBeenCalled();
    expect(getByTestId('immersve-kyc-processing')).toBeTruthy();
    expect(queryByTestId('onboarding-title')).toBeNull();
    expect(queryByTestId('immersve-verifying-identity-animation')).toBeNull();
    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    expect(setBarStyle).toHaveBeenCalledWith('dark-content', true);
    setBarStyle.mockRestore();
  });

  it('opens the KYC webview once and stays blank while it is open', () => {
    setNextAction({ type: 'kyc', url: KYC_URL });
    const { queryByTestId, rerender } = render(<ImmersveKYCProcessing />);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.IMMERSVE_KYC,
      { url: KYC_URL, redirectUrl: KYC_REDIRECT_URL },
    );
    expect(queryByTestId('onboarding-title')).toBeNull();
    expect(queryByTestId('immersve-verifying-identity-animation')).toBeNull();

    rerender(<ImmersveKYCProcessing />);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('opens the webview immediately from a kycUrl param without a first result', () => {
    mockParams = {
      countryKey: 'GB',
      kycUrl: 'https://verify.immersve.com/xyz',
    };
    setNextAction(null);
    const { queryByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.IMMERSVE_KYC,
      {
        url: 'https://verify.immersve.com/xyz',
        redirectUrl: KYC_REDIRECT_URL,
      },
    );
    expect(queryByTestId('onboarding-title')).toBeNull();
  });

  it('shows Verifying for a pending resume and does not route', () => {
    setNextAction({ type: 'pending' });
    const { getByTestId } = render(<ImmersveKYCProcessing />);

    expect(getByTestId('onboarding-title').props.children).toBe(
      IN_PROGRESS_TITLE,
    );
    expect(getByTestId('immersve-verifying-identity-animation')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockExitCardFlow).not.toHaveBeenCalled();
    expect(mockRoute).not.toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: CardProviderIds.Immersve,
      screen: CardScreens.KYC_PROCESSING,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('holds a pending KYC on this screen instead of funding, then times out to Card home', () => {
    const nextAction = deriveNextImmersveAction([
      {
        stage: 'funding',
        status: 'action-required',
        actionType: 'smart_contract_write',
        params: {
          abi: [],
          contractAddress: '0xusdc',
          method: 'approve',
          params: {},
        },
      },
      { stage: 'kyc', status: 'pending' },
    ]);
    setNextAction(nextAction);
    render(<ImmersveKYCProcessing />);

    expect(nextAction.type).toBe('pending');
    expect(mockRoute).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);
    });

    expect(mockExitCardFlow).toHaveBeenCalledWith({
      fallback: 'card-home-pending',
    });
    expect(mockNotifyKycInReview).toHaveBeenCalledTimes(1);
    expect(mockRoute).not.toHaveBeenCalled();
  });

  it('goes to Card home after the pending timeout', () => {
    setNextAction({ type: 'pending' });
    render(<ImmersveKYCProcessing />);

    act(() => {
      jest.advanceTimersByTime(POLLING_TIMEOUT_MS - 1);
    });
    expect(mockExitCardFlow).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(mockExitCardFlow).toHaveBeenCalledWith({
      fallback: 'card-home-pending',
    });
    expect(mockNotifyKycInReview).toHaveBeenCalledTimes(1);
  });

  it('treats expected spend like a pending review and times out to Card home', () => {
    setNextAction({ type: 'expected_spend' });
    const { getByTestId } = render(<ImmersveKYCProcessing />);

    expect(getByTestId('onboarding-title').props.children).toBe(
      IN_PROGRESS_TITLE,
    );
    expect(mockRoute).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);
    });

    expect(mockExitCardFlow).toHaveBeenCalledWith({
      fallback: 'card-home-pending',
    });
    expect(mockNotifyKycInReview).toHaveBeenCalledTimes(1);
  });

  it('does not time out to Card home while the webview is open', () => {
    setNextAction({ type: 'kyc', url: KYC_URL });
    const { rerender } = render(<ImmersveKYCProcessing />);

    setNextAction({ type: 'pending' });
    rerender(<ImmersveKYCProcessing />);

    act(() => {
      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);
    });
    expect(mockExitCardFlow).not.toHaveBeenCalled();

    closeWebview();
    act(() => {
      jest.advanceTimersByTime(POLLING_TIMEOUT_MS);
    });

    expect(mockExitCardFlow).toHaveBeenCalledWith({
      fallback: 'card-home-pending',
    });
    expect(mockNotifyKycInReview).toHaveBeenCalledTimes(1);
  });

  it('shows Not eligible in place for a rejection and does not navigate', () => {
    setNextAction({ type: 'rejected', canRetry: false });
    const { getByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockRoute).not.toHaveBeenCalled();
    expect(mockExitCardFlow).not.toHaveBeenCalled();
    expect(getByTestId('kyc-failed-title').props.children).toBe(
      'card.card_onboarding.kyc_failed.title',
    );
    expect(mockReduxDispatch).toHaveBeenCalledWith(resetOnboardingState());
    expect(mockNotifyKycRejected).toHaveBeenCalledWith(
      { type: 'rejected', canRetry: false },
      { source: 'processing', toast: false },
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: CardProviderIds.Immersve,
      screen: CardScreens.KYC_FAILED,
    });

    fireEvent.press(getByTestId('kyc-failed-close-button'));
    fireEvent.press(getByTestId('kyc-failed-back-button'));
    expect(mockExitCardFlow).toHaveBeenCalledTimes(2);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not show Not eligible while the retry webview is open', () => {
    mockParams = {
      countryKey: 'GB',
      kycUrl: 'https://verify.immersve.com/retry',
    };
    setNextAction({
      type: 'rejected',
      canRetry: true,
      retryUrl: 'https://verify.immersve.com/retry',
    });
    const { queryByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.IMMERSVE_KYC,
      {
        url: 'https://verify.immersve.com/retry',
        redirectUrl: KYC_REDIRECT_URL,
      },
    );
    expect(queryByTestId('kyc-failed-title')).toBeNull();
    expect(mockNotifyKycRejected).not.toHaveBeenCalled();
    expect(mockExitCardFlow).not.toHaveBeenCalled();
  });

  it.each([
    ['active', { type: 'active' } as ImmersveNextAction],
    ['funding', fundingAction],
  ])(
    'shows You are verified for %s and routes on Finish setup without the account toast',
    (_label, action) => {
      setNextAction(action);
      const { getByTestId, queryByTestId } = render(<ImmersveKYCProcessing />);

      expect(mockRoute).not.toHaveBeenCalled();
      expect(getByTestId(CompleteSelectors.TITLE)).toBeTruthy();
      expect(getByTestId(CompleteSelectors.CONFIRM_BUTTON)).toBeTruthy();
      expect(queryByTestId('card-header-close-button')).toBeNull();
      expect(queryByTestId('kyc-failed-back-button')).toBeNull();
      expect(mockAddProperties).toHaveBeenCalledWith({
        provider: CardProviderIds.Immersve,
        screen: CardScreens.COMPLETE,
      });

      fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));
      expect(mockApproveFunding).not.toHaveBeenCalled();
      expect(mockRoute).toHaveBeenCalledWith(action, {
        countryKey: 'GB',
        showAccountExistsToast: false,
      });
    },
  );

  it('starts Money account approval in the background before Finish setup', () => {
    mockIsMoneyAccountCountry = true;
    setNextAction(fundingAction);
    const { getByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockApproveFunding).toHaveBeenCalledWith('SIGN_UP');
    expect(mockRoute).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));
    expect(mockRoute).toHaveBeenCalledWith(fundingAction, {
      countryKey: 'GB',
      showAccountExistsToast: false,
    });
  });

  it('holds Verifying for 2s after the webview closes before a fast approval', () => {
    setNextAction({ type: 'kyc', url: KYC_URL });
    const { getByTestId, queryByTestId } = render(<ImmersveKYCProcessing />);

    setNextAction({ type: 'active' });
    closeWebview();

    expect(getByTestId('onboarding-title').props.children).toBe(
      IN_PROGRESS_TITLE,
    );
    expect(queryByTestId(CompleteSelectors.CONFIRM_BUTTON)).toBeNull();
    expect(mockRoute).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(IMMERSVE_KYC_RESULT_MIN_DWELL_MS - 1);
    });
    expect(queryByTestId(CompleteSelectors.CONFIRM_BUTTON)).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));
    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'active' },
      { countryKey: 'GB', showAccountExistsToast: false },
    );
  });

  it('re-polls when the KYC webview reports a close', () => {
    setNextAction({ type: 'pending' });
    render(<ImmersveKYCProcessing />);
    mockRefresh.mockClear();

    closeWebview();

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('prompts to reopen after the dwell when KYC is still outstanding', () => {
    setNextAction({ type: 'kyc', url: KYC_URL });
    const { getByTestId, queryByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    closeWebview();
    expect(queryByTestId('immersve-kyc-processing-reopen-button')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(IMMERSVE_KYC_RESULT_MIN_DWELL_MS);
    });

    fireEvent.press(getByTestId('immersve-kyc-processing-reopen-button'));
    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(
      Routes.CARD.ONBOARDING.IMMERSVE_KYC,
      { url: KYC_URL, redirectUrl: KYC_REDIRECT_URL },
    );
  });

  it('keeps Verifying instead of the reopen prompt while a re-poll is in flight', () => {
    setNextAction({ type: 'kyc', url: KYC_URL });
    const { getByTestId, queryByTestId } = render(<ImmersveKYCProcessing />);

    setNextAction({ type: 'kyc', url: KYC_URL }, null, true);
    closeWebview();
    act(() => {
      jest.advanceTimersByTime(IMMERSVE_KYC_RESULT_MIN_DWELL_MS);
    });

    expect(getByTestId('onboarding-title').props.children).toBe(
      IN_PROGRESS_TITLE,
    );
    expect(queryByTestId('immersve-kyc-processing-reopen-button')).toBeNull();
  });

  it('shows a poll failure in place and retries on Try again', () => {
    setNextAction(null, 'Something went wrong');
    const { getByTestId } = render(<ImmersveKYCProcessing />);

    expect(getByTestId('onboarding-title').props.children).toBe(
      'card.card_onboarding.immersve_kyc_processing.error_title',
    );
    expect(getByTestId('immersve-kyc-processing-error').props.children).toBe(
      'Something went wrong',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();

    mockRefresh.mockClear();
    fireEvent.press(getByTestId('immersve-kyc-processing-retry-button'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('polls every 2s', () => {
    render(<ImmersveKYCProcessing />);
    expect(useImmersveSpendingPrerequisites).toHaveBeenCalledWith(
      expect.objectContaining({ pollIntervalMs: 2000 }),
    );
  });

  it('prompts instead of auto-opening for KYC_NOT_COMPLETED', () => {
    setNextAction({
      type: 'kyc',
      url: KYC_URL,
      ctaHint: 'KYC_NOT_COMPLETED',
    });
    const { getByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(getByTestId('immersve-kyc-processing-illustration')).toBeTruthy();
    expect(getByTestId('immersve-verifying-identity-animation')).toBeTruthy();
    expect(getByTestId('immersve-kyc-processing-reopen-button')).toBeTruthy();
    expect(getByTestId('onboarding-title').props.children).toBe(
      'card.card_onboarding.immersve_kyc_processing.incomplete_title',
    );
  });

  it('shows the info-needed copy for KYC_INFORMATION_NEEDED', () => {
    setNextAction({
      type: 'kyc',
      url: KYC_URL,
      ctaHint: 'KYC_INFORMATION_NEEDED',
    });
    const { getByTestId } = render(<ImmersveKYCProcessing />);

    expect(getByTestId('onboarding-title').props.children).toBe(
      'card.card_onboarding.immersve_kyc_processing.info_needed_title',
    );
    const label = ([] as unknown[])
      .concat(
        getByTestId('immersve-kyc-processing-reopen-button').props.children,
      )
      .filter(Boolean)
      .join('');
    expect(label).toBe(
      'card.card_onboarding.immersve_kyc_processing.info_needed_button',
    );
  });

  it('treats KYC_EXPIRING as an expired session with Back to home', () => {
    setNextAction({
      type: 'kyc',
      url: KYC_URL,
      ctaHint: 'KYC_EXPIRING',
    });
    const { getByTestId, queryByTestId } = render(<ImmersveKYCProcessing />);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(queryByTestId('immersve-kyc-processing-reopen-button')).toBeNull();
    expect(getByTestId('onboarding-title').props.children).toBe(
      'card.card_onboarding.immersve_kyc_processing.expired_title',
    );
    expect(getByTestId('immersve-kyc-processing-error').props.children).toBe(
      'card.card_onboarding.immersve_kyc_processing.expiring_error',
    );

    fireEvent.press(getByTestId('immersve-kyc-processing-back-home-button'));
    expect(mockExitCardFlow).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('tracks each result view once as the screen swaps', () => {
    setNextAction({ type: 'pending' });
    const { rerender } = render(<ImmersveKYCProcessing />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: CardProviderIds.Immersve,
      screen: CardScreens.KYC_PROCESSING,
    });

    mockAddProperties.mockClear();
    setNextAction({ type: 'active' });
    rerender(<ImmersveKYCProcessing />);

    expect(mockAddProperties).toHaveBeenCalledTimes(1);
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: CardProviderIds.Immersve,
      screen: CardScreens.COMPLETE,
    });
  });
});
