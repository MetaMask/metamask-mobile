import React from 'react';
import { Linking } from 'react-native';
import { render } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import VbaAccountCreateError from '../VbaAccountCreateError';
import type { VbaOnboardingParamList } from '../routes';
import VbaAccountCreateErrorAdapter from './AccountCreateErrorAdapter';
import { useScreenPerformance } from '../../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from '../vbaScreenPerformance';

const mockNavigation = { navigate: jest.fn() };
const mockOpenCompletedVbaAccount = jest.fn();
const mockResumeOnboarding = jest.fn();
const mockOpenSupportWithConsent = jest.fn();
const mockVbaAccountCreateError = jest.fn(
  (_props: React.ComponentProps<typeof VbaAccountCreateError>) => null,
);
let mockRouteParams: VbaOnboardingParamList['VbaAccountCreateError'];

const renderAdapter = () => {
  render(<VbaAccountCreateErrorAdapter />);
  const props = mockVbaAccountCreateError.mock.calls[0]?.[0];
  if (!props) {
    throw new Error('VbaAccountCreateError was not rendered');
  }
  return props;
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../hooks/useVbaOnboardingRouting', () => ({
  openCompletedVbaAccount: (...args: unknown[]) =>
    mockOpenCompletedVbaAccount(...args),
  useOpenVbaOnboarding: () => mockResumeOnboarding,
}));

jest.mock('../../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

jest.mock('../VbaAccountCreateError', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<typeof VbaAccountCreateError>) =>
    mockVbaAccountCreateError(props),
}));

jest.mock('../../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);

describe('VbaAccountCreateErrorAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockRouteParams = {
      variant: 'generic',
      failure: { httpStatus: 500 },
      sourceCurrency: 'USD',
    };
  });

  it('reopens account creation in the failed source currency', () => {
    const props = renderAdapter();

    props.onPrimary();
    props.onPrimary();

    expect(props.primaryActionType).toBe('retry');
    expect(mockOpenCompletedVbaAccount).toHaveBeenCalledWith(
      mockNavigation,
      'USD',
    );
    expect(mockOpenCompletedVbaAccount).toHaveBeenCalledTimes(1);
    expect(mockResumeOnboarding).not.toHaveBeenCalled();
  });

  it('resolves onboarding again when the failure has no source currency', () => {
    mockRouteParams = {
      variant: 'generic',
      failure: { httpStatus: 500 },
    };
    const props = renderAdapter();

    props.onPrimary();

    expect(mockResumeOnboarding).toHaveBeenCalledTimes(1);
    expect(mockOpenCompletedVbaAccount).not.toHaveBeenCalled();
  });

  it('retries a recoverable setup failure without an HTTP status', () => {
    mockRouteParams = {
      variant: 'generic',
      sourceCurrency: 'BRL',
      retryable: true,
    };
    const props = renderAdapter();

    props.onPrimary();

    expect(props.primaryActionType).toBe('retry');
    expect(mockOpenCompletedVbaAccount).toHaveBeenCalledWith(
      mockNavigation,
      'BRL',
    );
    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
  });

  it.each([
    ['generic without status', { variant: 'generic' }, 'generic'],
    [
      'generic unauthorized',
      { variant: 'generic', failure: { httpStatus: 401 } },
      'generic',
    ],
    [
      'details failure',
      { variant: 'details', failure: { httpStatus: 400 } },
      'details',
    ],
  ] as const)('opens support for %s', async (_label, params, variant) => {
    mockRouteParams = params;
    const props = renderAdapter();

    props.onPrimary();

    expect(props.variant).toBe(variant);
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId:
        variant === 'details'
          ? VBA_SCREEN_ID.ACCOUNT_CREATE_DETAILS_ERROR
          : VBA_SCREEN_ID.ACCOUNT_CREATE_GENERIC_ERROR,
      contentReady: true,
      contentState: VBA_SCREEN_CONTENT_STATE.ERROR,
    });
    expect(props.primaryActionType).toBe('contactSupport');
    expect(mockOpenSupportWithConsent).toHaveBeenCalledTimes(1);
    expect(mockOpenCompletedVbaAccount).not.toHaveBeenCalled();
    expect(mockResumeOnboarding).not.toHaveBeenCalled();

    const [openUrl, supportUrl] = mockOpenSupportWithConsent.mock.calls[0];
    await openUrl('https://support.example/path');

    expect(supportUrl).toContain('https://support.metamask.io/');
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://support.example/path',
    );
  });

  it('leaves account creation from Back and Done', () => {
    mockRouteParams = { variant: 'details' };
    const props = renderAdapter();

    props.onBack?.();
    props.onSecondary();

    expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });
});
