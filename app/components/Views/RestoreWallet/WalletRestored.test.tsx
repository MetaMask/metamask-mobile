import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import WalletRestored from './WalletRestored';
import { useNavigation } from '@react-navigation/native';
import { useMetrics } from '../../../components/hooks/useMetrics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import Routes from '../../../constants/navigation/Routes';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Logger from '../../../util/Logger';
import { MIGRATION_ERROR_HAPPENED } from '../../../constants/storage';

// Mock all external dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
jest.mock('redux-persist-filesystem-storage', () => ({
  removeItem: jest.fn(() => Promise.resolve()),
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
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
jest.mock('../../../util/metrics');
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
    // Arrange & Act
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

  it('navigates to LOGIN with vault recovery flag when continue is pressed', async () => {
    // Arrange
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    await act(async () => {
      fireEvent.press(continueButton);
    });

    // Assert
    await waitFor(() => {
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.ONBOARDING.LOGIN,
      );
    });
  });

  it('tracks continue button press event with device metadata', async () => {
    // Arrange
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    await act(async () => {
      fireEvent.press(continueButton);
    });

    // Assert
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });
  });

  it('generates device metadata once using useMemo', () => {
    // Arrange & Act
    renderWithProvider(<WalletRestored />);

    // Assert
    expect(generateDeviceAnalyticsMetaData).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation on mount', () => {
    // Arrange & Act
    renderWithProvider(<WalletRestored />);

    // Assert
    expect(mockNavigation.replace).not.toHaveBeenCalled();
  });

  it('clears migration error flag when continue is pressed', async () => {
    // Arrange
    const mockFilesystemRemoveItem = FilesystemStorage.removeItem as jest.Mock;
    mockFilesystemRemoveItem.mockResolvedValue(undefined);
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    await act(async () => {
      fireEvent.press(continueButton);
    });

    // Assert
    await waitFor(() => {
      expect(mockFilesystemRemoveItem).toHaveBeenCalledWith(
        MIGRATION_ERROR_HAPPENED,
      );
    });
  });

  it('logs error when clearing migration error flag fails', async () => {
    // Arrange
    const mockError = new Error('FilesystemStorage removeItem failed');
    const mockFilesystemRemoveItem = FilesystemStorage.removeItem as jest.Mock;
    mockFilesystemRemoveItem.mockRejectedValue(mockError);
    const mockLoggerError = Logger.error as jest.Mock;
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    await act(async () => {
      fireEvent.press(continueButton);
    });

    // Assert
    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'Failed to clear migration error flag',
      );
    });
  });

  it('navigates to LOGIN even when clearing migration error flag fails', async () => {
    // Arrange
    const mockError = new Error('FilesystemStorage removeItem failed');
    const mockFilesystemRemoveItem = FilesystemStorage.removeItem as jest.Mock;
    mockFilesystemRemoveItem.mockRejectedValue(mockError);
    const { getByText } = renderWithProvider(<WalletRestored />);
    const continueButton = getByText('Continue to wallet');

    // Act
    await act(async () => {
      fireEvent.press(continueButton);
    });

    // Assert - Navigation proceeds to allow user access, recovery will retry on next launch
    await waitFor(() => {
      expect(mockNavigation.replace).toHaveBeenCalledWith(
        Routes.ONBOARDING.LOGIN,
      );
    });
  });
});
