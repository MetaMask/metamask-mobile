import React from 'react';
import { screen } from '@testing-library/react-native';
import ProviderWebview from './ProviderWebview';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockUseDepositSdkMethod = jest.fn();

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

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => mockUseDepositSdkMethod(),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.PROVIDER_WEBVIEW);
}

describe('ProviderWebview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: null, isFetching: false },
    ]);
  });

  it('render matches snapshot', () => {
    render(ProviderWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(ProviderWebview);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Provider Webview',
      }),
    );
  });

  it('displays loading state', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: null, isFetching: true },
    ]);

    render(ProviderWebview);
    expect(screen.getByText('Loading KYC status...')).toBeTruthy();
  });

  it('displays error state', () => {
    const errorMessage = 'Network error';
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: errorMessage, isFetching: false },
    ]);

    render(ProviderWebview);
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeTruthy();
  });

  it('displays no KYC data available when userDetailsResponse is null', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: null, isFetching: false },
    ]);

    render(ProviderWebview);
    expect(screen.getByText('No KYC data available')).toBeTruthy();
  });

  it('displays KYC status when user details are available', () => {
    const mockUserDetails = {
      kyc: {
        l1: {
          status: 'approved',
          type: 'individual',
        },
      },
    };

    mockUseDepositSdkMethod.mockReturnValue([
      { data: mockUserDetails, error: null, isFetching: false },
    ]);

    render(ProviderWebview);
    expect(
      screen.getByText('The user KYC is approved for the type individual'),
    ).toBeTruthy();
  });

  it('displays Continue button', () => {
    render(ProviderWebview);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('displays quote information', () => {
    render(ProviderWebview);
    expect(screen.getByText(/Quote:/)).toBeTruthy();
  });
});
