import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import AdditionalVerification from './AdditionalVerification';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';

const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockNavigateToKycWebview = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: () => ({
    navigateToKycWebview: mockNavigateToKycWebview,
  }),
}));

jest.mock('../../../../../../util/navigation/navUtils.ts', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils.ts'),
  useParams: () => ({
    quote: { id: 'test-quote' },
    kycUrl: 'https://test-kyc-url.com',
    paymentMethodId: 'pm_123',
  }),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.VERIFY_IDENTITY,
    },
    {
      state: initialRootState,
    },
  );
}

describe('AdditionalVerification Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and continue button', () => {
    render(AdditionalVerification);
    expect(
      screen.getAllByText(strings('deposit.additional_verification.title'))[0],
    ).toBeOnTheScreen();
    expect(
      screen.getAllByText(strings('deposit.additional_verification.button'))[0],
    ).toBeOnTheScreen();
  });

  it('renders deposit screen header with navbar title', () => {
    render(AdditionalVerification);
    expect(
      screen.getAllByText(strings('deposit.additional_verification.title'))[0],
    ).toBeOnTheScreen();
    expect(screen.getByTestId('deposit-back-navbar-button')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    render(AdditionalVerification);
    fireEvent.press(screen.getByTestId('deposit-back-navbar-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls navigateToKycWebview when continue button is pressed', () => {
    render(AdditionalVerification);

    const continueButton = screen.getByText('Continue');
    fireEvent.press(continueButton);

    expect(mockNavigateToKycWebview).toHaveBeenCalledWith({
      quote: { id: 'test-quote' },
      kycUrl: 'https://test-kyc-url.com',
    });
  });
});
