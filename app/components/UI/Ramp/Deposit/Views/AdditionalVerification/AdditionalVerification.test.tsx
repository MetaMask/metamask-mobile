import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import AdditionalVerification from './AdditionalVerification';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

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

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Verify your identity',
  }),
}));

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: () => ({
    navigateToKycWebview: mockNavigateToKycWebview,
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.VERIFY_IDENTITY);
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
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Verify your identity',
      }),
    );
  });

  it('calls navigateToKycWebview when continue button is pressed', () => {
    render(AdditionalVerification);

    const continueButton = screen.getByText('Continue');
    fireEvent.press(continueButton);

    expect(mockNavigateToKycWebview).toHaveBeenCalledWith({
      quote: expect.any(Object),
      kycUrl: expect.any(String),
    });
  });
});
