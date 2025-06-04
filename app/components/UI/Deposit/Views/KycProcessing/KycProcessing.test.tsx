import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import KycProcessing from './KycProcessing';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'KYC Processing',
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'deposit.kyc_processing.title': 'KYC Processing',
      'deposit.kyc_processing.heading': "We're processing your information",
      'deposit.kyc_processing.description':
        "This may take a few moments. We'll notify you once it's complete.",
      'deposit.kyc_processing.button': 'Browse tokens',
    };
    return mockStrings[key] || key;
  }),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.KYC_PROCESSING,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('KycProcessing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(KycProcessing);
    expect(screen.getByText("We're processing your information")).toBeTruthy();
    expect(
      screen.getByText(
        "This may take a few moments. We'll notify you once it's complete.",
      ),
    ).toBeTruthy();
  });

  it('calls setOptions when the component mounts', () => {
    render(KycProcessing);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'KYC Processing',
      }),
    );
  });

  it('navigates to browser tab on button press', async () => {
    render(KycProcessing);
    fireEvent.press(screen.getByRole('button', { name: 'Browse tokens' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER_TAB_HOME);
    });
  });
});
