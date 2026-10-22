import React from 'react';
import { render } from '@testing-library/react-native';
import VbaAccountCreateError from '../VbaAccountCreateError';
import type { VbaOnboardingParamList } from '../routes';
import VbaAccountCreateErrorAdapter from './AccountCreateErrorAdapter';

const mockNavigation = { navigate: jest.fn() };
const mockOpenCompletedVbaAccount = jest.fn();
const mockResumeOnboarding = jest.fn();
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
  useSupportConsent: () => ({ openSupportWithConsent: jest.fn() }),
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

    expect(mockOpenCompletedVbaAccount).toHaveBeenCalledWith(
      mockNavigation,
      'USD',
    );
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
});
