import React from 'react';
import { useSelector } from 'react-redux';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';
import { KeyringClient } from '@metamask/keyring-snap-client';
import SolanaNewFeatureContent from './SolanaNewFeatureContent';
import StorageWrapper from '../../../store/storage-wrapper';

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@metamask/keyring-snap-client', () => ({
  KeyringClient: jest.fn().mockImplementation(() => ({
    createAccount: jest.fn(),
  })),
}));

jest.mock('../../../core/SnapKeyring/SolanaWalletSnap', () => ({
  SolanaWalletSnapSender: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {component}
    </SafeAreaProvider>,
  );

describe('SolanaNewFeatureContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(false);
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('false');
  });

  it('renders correctly', async () => {
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(getByText('solana_new_feature_content.title')).toBeTruthy();
      expect(
        getByText('solana_new_feature_content.feature_1_title'),
      ).toBeTruthy();
      expect(
        getByText('solana_new_feature_content.feature_2_title'),
      ).toBeTruthy();
      expect(
        getByText('solana_new_feature_content.feature_3_title'),
      ).toBeTruthy();
    });
  });

  it('calls setItem when the "close" button is pressed', async () => {
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      const closeButton = getByText('solana_new_feature_content.not_now');
      fireEvent.press(closeButton);
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      '@MetaMask:solanaFeatureModalShown',
      'true',
    );
  });

  it('shows the "create account"  button for new users', async () => {
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(
        getByText('solana_new_feature_content.create_solana_account'),
      ).toBeTruthy();
    });
  });

  it('shows the "got it" button for existing users', async () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(getByText('solana_new_feature_content.got_it')).toBeTruthy();
    });
  });

  it('creates an account when "create account" button is pressed', async () => {
    const mockCreateAccount = jest.fn();
    (KeyringClient as jest.Mock).mockImplementation(() => ({
      createAccount: mockCreateAccount,
    }));

    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      const createButton = getByText(
        'solana_new_feature_content.create_solana_account',
      );
      fireEvent.press(createButton);
    });

    expect(mockCreateAccount).toHaveBeenCalledWith({
      scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      '@MetaMask:solanaFeatureModalShown',
      'true',
    );
  });

  it('does not render when modal has been shown before', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('true');
    const { queryByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(queryByText('solana_new_feature_content.title')).toBeNull();
    });
  });
});
