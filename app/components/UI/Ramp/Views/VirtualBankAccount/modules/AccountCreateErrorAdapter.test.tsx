import React from 'react';
import { render } from '@testing-library/react-native';
import VbaAccountCreateError from '../VbaAccountCreateError';
import type { VbaOnboardingParamList } from '../routes';
import VbaAccountCreateErrorAdapter from './AccountCreateErrorAdapter';

const mockNavigation = { navigate: jest.fn() };
const mockOpenCompletedVbaAccount = jest.fn();
const mockResumeOnboarding = jest.fn();
const mockOpenSupportWithConsent = jest.fn();
const mockVbaAccountCreateError = jest.fn(() => null);
let mockRouteParams: VbaOnboardingParamList['VbaAccountCreateError'];

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

describe('VbaAccountCreateErrorAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      variant: 'generic',
      failure: { httpStatus: 500 },
      sourceCurrency: 'USD',
    };
  });

  it('reopens account creation in the failed source currency', () => {
    render(<VbaAccountCreateErrorAdapter />);
    const props = mockVbaAccountCreateError.mock.calls[0][0];

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
    render(<VbaAccountCreateErrorAdapter />);
    const props = mockVbaAccountCreateError.mock.calls[0][0];

    props.onPrimary();

    expect(mockResumeOnboarding).toHaveBeenCalledTimes(1);
    expect(mockOpenCompletedVbaAccount).not.toHaveBeenCalled();
  });

  it.each([
    ['unauthorized', 401],
    ['missing customer', 404],
  ])('opens support for %s failures', (_label, httpStatus) => {
    mockRouteParams = {
      variant: 'generic',
      failure: { httpStatus },
      sourceCurrency: 'USD',
    };
    render(<VbaAccountCreateErrorAdapter />);
    const props = mockVbaAccountCreateError.mock.calls[0][0];

    props.onPrimary();

    expect(props.primaryActionType).toBe('contactSupport');
    expect(mockOpenSupportWithConsent).toHaveBeenCalledTimes(1);
    expect(mockOpenCompletedVbaAccount).not.toHaveBeenCalled();
    expect(mockResumeOnboarding).not.toHaveBeenCalled();
  });
});
