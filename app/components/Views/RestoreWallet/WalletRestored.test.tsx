import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import WalletRestored from './WalletRestored';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { setExistingUser } from '../../../actions/user';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Mock all external dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));
jest.mock('../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => ({
    colors: {
      primary: {
        inverse: '#FFFFFF',
      },
      background: {
        default: '#000000',
      },
    },
  })),
}));
jest.mock('../../../components/hooks/useMetrics');
jest.mock('../../../actions/user');
jest.mock('../../../util/metrics');
jest.mock('../../../util/Logger');
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

describe('WalletRestored', () => {
  const mockNavigation = {
    replace: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockDispatch = jest.fn();
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh mock chain each time
    const mockBuild = jest.fn().mockReturnValue({ name: 'test-event' });
    const mockAddProperties = jest.fn().mockReturnValue({
      build: mockBuild,
    });
    const mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: mockAddProperties,
    });

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    (generateDeviceAnalyticsMetaData as jest.Mock).mockReturnValue({
      os: 'ios',
      version: '1.0.0',
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly with all required elements', () => {
    // Arrange
    const { getByText } = renderWithProvider(<WalletRestored />);

    // Assert
    expect(getByText('🎉')).toBeOnTheScreen();
    expect(getByText('Your wallet is ready!')).toBeOnTheScreen();
    expect(getByText('Continue to wallet')).toBeOnTheScreen();
  });

  it('opens SRP guide URL when backup link is pressed', async () => {
    // Arrange
    const { getByText } = renderWithProvider(<WalletRestored />);
    const backupLink = getByText(' back up your Secret Recovery Phrase ');

    // Act
    fireEvent.press(backupLink);

    // Assert
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(SRP_GUIDE_URL);
    });
  });

  it('dispatches setExistingUser when continue is pressed', async () => {
    // Arrange
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    fireEvent.press(continueButton);

    // Assert
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(setExistingUser(true));
    });
  });

  it('navigates to LOGIN route after continue is pressed', async () => {
    // Arrange
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    fireEvent.press(continueButton);

    // Assert
    await waitFor(() => {
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.ONBOARDING.LOGIN,
      );
    });
  });

  it('logs error when finishWalletRestore fails', async () => {
    // Arrange
    const testError = new Error('Test dispatch error');
    mockDispatch.mockImplementationOnce(() => {
      throw testError;
    });
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    fireEvent.press(continueButton);

    // Assert
    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        'WalletRestored: Error during finishWalletRestore',
      );
    });
  });

  it('navigates to LOGIN even when error occurs', async () => {
    // Arrange
    const testError = new Error('Test dispatch error');
    mockDispatch.mockImplementationOnce(() => {
      throw testError;
    });
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    fireEvent.press(continueButton);

    // Assert
    await waitFor(() => {
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.ONBOARDING.LOGIN,
      );
    });
  });

  it('generates device metadata once using useMemo', () => {
    // Arrange & Act
    renderWithProvider(<WalletRestored />);

    // Assert
    expect(generateDeviceAnalyticsMetaData).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation or dispatch on mount', () => {
    // Arrange & Act
    renderWithProvider(<WalletRestored />);

    // Assert
    expect(mockNavigation.replace).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
