import React from 'react';
import { screen } from '@testing-library/react-native';
import ProviderWebview from './ProviderWebview';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

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

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.PROVIDER_WEBVIEW);
}

describe('ProviderWebview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
