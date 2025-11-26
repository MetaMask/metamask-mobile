import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import GetStarted from './GetStarted';
import { useDepositSDK } from '../../../sdk';
import { getDepositNavbarOptions } from '../../../../../Navbar';
import useDepositFeatureFlags from '../../../hooks/useDepositFeatureFlags';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../../../sdk', () => ({
  useDepositSDK: jest.fn(),
}));

jest.mock('../../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../hooks/useDepositFeatureFlags');

const mockSetOptions = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      setOptions: mockSetOptions,
      reset: mockReset,
    }),
  };
});

describe('GetStarted', () => {
  const mockSetGetStarted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDepositSDK as jest.Mock).mockReturnValue({
      getStarted: false,
      setGetStarted: mockSetGetStarted,
    });

    (
      useDepositFeatureFlags as jest.MockedFunction<
        typeof useDepositFeatureFlags
      >
    ).mockReturnValue({
      metamaskUsdEnabled: false,
    });
  });

  it('render matches snapshot', () => {
    renderWithProvider(<GetStarted />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders blank screen when getStarted is true', () => {
    (useDepositSDK as jest.Mock).mockReturnValue({
      getStarted: true,
      setGetStarted: mockSetGetStarted,
    });

    renderWithProvider(<GetStarted />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions with navbar options when rendering', () => {
    renderWithProvider(<GetStarted />);
    expect(mockSetOptions).toHaveBeenCalledTimes(1);
    expect(getDepositNavbarOptions).toHaveBeenCalledWith(
      expect.anything(),
      { title: 'Deposit' },
      expect.anything(),
    );
  });

  it('calls setGetStarted when the "Get started" button is pressed', () => {
    renderWithProvider(<GetStarted />);
    const getStartedButton = screen.getByText('Get started');
    fireEvent.press(getStartedButton);
    expect(mockSetGetStarted).toHaveBeenCalledWith(true);
  });

  describe('MUSD feature flag', () => {
    it('displays USDC content when MUSD feature flag is disabled', () => {
      (
        useDepositFeatureFlags as jest.MockedFunction<
          typeof useDepositFeatureFlags
        >
      ).mockReturnValue({
        metamaskUsdEnabled: false,
      });

      renderWithProvider(<GetStarted />);

      expect(screen.getByText('Starting is easy with USDC')).toBeOnTheScreen();
    });

    it('displays MUSD content when MUSD feature flag is enabled', () => {
      (
        useDepositFeatureFlags as jest.MockedFunction<
          typeof useDepositFeatureFlags
        >
      ).mockReturnValue({
        metamaskUsdEnabled: true,
      });

      renderWithProvider(<GetStarted />);

      expect(screen.getByText('Starting is easy with mUSD')).toBeOnTheScreen();
    });
  });
});
