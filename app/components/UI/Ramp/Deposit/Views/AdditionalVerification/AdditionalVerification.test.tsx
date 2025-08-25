import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import AdditionalVerification from './AdditionalVerification';
import Routes from '../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';

const mockSetNavigationOptions = jest.fn();
const mockNavigateToKycWebview = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
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
    cryptoCurrencyChainId: '1',
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

  it('render matches snapshot', () => {
    render(AdditionalVerification);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(AdditionalVerification);
    expect(mockSetNavigationOptions).toHaveBeenCalled();
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
