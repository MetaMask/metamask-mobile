import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import VerifyIdentity from './VerifyIdentity';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { DepositSdkResult } from '../../hooks/useDepositSdkMethod';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockUseDepositSdkMethodInitialValues: DepositSdkResult<'success'> = {
  error: null,
  loading: false,
  sdkMethod: jest.fn().mockResolvedValue('Success'),
  response: null,
};

let mockUseDepositSdkMethodValues: DepositSdkResult<'success'> = {
  ...mockUseDepositSdkMethodInitialValues,
};

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethodValues,
}));

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
    title: 'Verify your identity',
  }),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.VERIFY_IDENTITY,
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

describe('VerifyIdentity Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethodValues = {
      ...mockUseDepositSdkMethodInitialValues,
    };
  });

  it('renders correctly', () => {
    render(VerifyIdentity);
    expect(
      screen.getByText(
        'To deposit cash, we’ll need to verify your identity. This helps keep your account secure and your information private.',
      ),
    ).toBeTruthy();
  });

  it('calls setOptions when the component mounts', () => {
    render(VerifyIdentity);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Verify your identity',
      }),
    );
  });

  it('navigates to next screen on "Get started" button press', async () => {
    render(VerifyIdentity);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.DEPOSIT.BASIC_INFO,
        undefined,
      );
    });
  });
});
