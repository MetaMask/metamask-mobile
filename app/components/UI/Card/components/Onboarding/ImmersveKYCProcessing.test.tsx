import React from 'react';
import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ImmersveKYCProcessing, {
  KYC_REDIRECT_URL,
} from './ImmersveKYCProcessing';
import Routes from '../../../../../constants/navigation/Routes';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import type { ImmersveNextAction } from '../../util/immersvePrerequisites';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  // Invoke the focus callback synchronously on render.
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'fs-1'),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({ countryKey: 'GB' }),
}));

jest.mock('../../hooks/useImmersveSpendingPrerequisites');

const mockRefresh = jest.fn().mockResolvedValue(null);

jest.mock('../../../AnimatedSpinner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID: testID || 'animated-spinner' }),
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  }),
}));

jest.mock('../../util/metrics', () => ({
  CardScreens: { KYC_PROCESSING: 'KYC_PROCESSING' },
}));

jest.mock('./OnboardingStep', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({ formFields }: { formFields: React.ReactNode }) =>
    ReactActual.createElement(View, { testID: 'onboarding-step' }, formFields);
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(View, p, children),
    Text: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(Text, p, children),
    TextVariant: { BodyMd: 'BodyMd' },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const POLLING_TIMEOUT_MS = 30000;

const mockNavigate = jest.fn();
const mockReset = jest.fn();

const setNextAction = (nextAction: ImmersveNextAction | null) => {
  (useImmersveSpendingPrerequisites as jest.Mock).mockReturnValue({
    nextAction,
    refresh: mockRefresh,
    prerequisites: [],
    isLoading: false,
    error: null,
  });
};

describe('ImmersveKYCProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    });
    setNextAction(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('re-polls on focus and renders the spinner', () => {
    const { getByTestId } = render(<ImmersveKYCProcessing />);
    expect(mockRefresh).toHaveBeenCalled();
    expect(getByTestId('immersve-kyc-processing-spinner')).toBeTruthy();
  });

  it('opens the KYC webview modal once when action is kyc', () => {
    setNextAction({ type: 'kyc', url: 'https://verify.immersve.com/abc' });
    const { rerender } = render(<ImmersveKYCProcessing />);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.IMMERSVE_KYC,
      params: {
        url: 'https://verify.immersve.com/abc',
        redirectUrl: KYC_REDIRECT_URL,
      },
    });

    // Re-render with the same kyc action must not re-open the webview.
    rerender(<ImmersveKYCProcessing />);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('does not navigate while pending', () => {
    setNextAction({ type: 'pending' });
    render(<ImmersveKYCProcessing />);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('resets to KYC_PENDING after the pending timeout', () => {
    setNextAction({ type: 'pending' });
    render(<ImmersveKYCProcessing />);

    expect(mockReset).not.toHaveBeenCalled();
    jest.advanceTimersByTime(POLLING_TIMEOUT_MS);

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
    });
  });

  it('resets to KYC_FAILED when rejected', () => {
    setNextAction({ type: 'rejected' });
    render(<ImmersveKYCProcessing />);

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
    });
  });

  it('parks approved (active) on the interim pending terminus', () => {
    setNextAction({ type: 'active' });
    render(<ImmersveKYCProcessing />);

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
    });
  });
});
