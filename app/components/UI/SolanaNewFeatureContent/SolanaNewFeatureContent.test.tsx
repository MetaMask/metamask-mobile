import React from 'react';
import { useSelector } from 'react-redux';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';
import SolanaNewFeatureContent from './SolanaNewFeatureContent';
import StorageWrapper from '../../../store/storage-wrapper';
import { backgroundState } from '../../../util/test/initial-root-state';
import { SolAccountType, SolScope } from '@metamask/keyring-api';
import { Linking } from 'react-native';
import { SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE } from '../../../constants/urls';
import Engine from '../../../core/Engine';
import { MOCK_SOLANA_ACCOUNT } from '../../../util/test/accountsControllerTestUtils';
import Routes from '../../../constants/navigation/Routes';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';

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

const mockSnapClient = {
  createAccount: jest.fn(),
};

jest.mock('../../../core/SnapKeyring/MultichainWalletSnapClient', () => ({
  ...jest.requireActual('../../../core/SnapKeyring/MultichainWalletSnapClient'),
  MultichainWalletSnapFactory: {
    createClient: jest.fn().mockImplementation(() => mockSnapClient),
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../core/Engine', () => ({
  setSelectedAddress: jest.fn(),
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

  it('shows the "view solana account" button for existing users', async () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(
        getByText('solana_new_feature_content.view_solana_account'),
      ).toBeTruthy();
    });
  });

  it('opens the AddNewAccount modal when "create account" button is pressed', async () => {
    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      const createButton = getByText(
        'solana_new_feature_content.create_solana_account',
      );
      fireEvent.press(createButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ADD_ACCOUNT,
      params: {
        clientType: WalletClientType.Solana,
        scope: SolScope.Mainnet,
      },
    });
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      '@MetaMask:solanaFeatureModalShown',
      'true',
    );
  });

  it('shows "view solana account" button and navigates to solana account if user has a solana account', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: {
              internalAccounts: {
                selectedAccount: '1',
                accounts: {
                  '1': {
                    address: '0xSomeAddress',
                  },
                  '2': {
                    address: MOCK_SOLANA_ACCOUNT.address,
                    type: SolAccountType.DataAccount,
                  },
                },
              },
            },
          },
        },
      }),
    );

    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(
        getByText('solana_new_feature_content.view_solana_account'),
      ).toBeTruthy();
    });

    fireEvent.press(
      getByText('solana_new_feature_content.view_solana_account'),
    );
    expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
      MOCK_SOLANA_ACCOUNT.address,
    );
  });

  it('does not render when modal has been shown before', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue('true');
    const { queryByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(queryByText('solana_new_feature_content.title')).toBeNull();
    });
  });

  it('navigates to learn more page when "learn more" button is pressed', async () => {
    Linking.openURL = mockNavigate;

    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: [],
        },
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: {
              internalAccounts: {
                selectedAccount: '2',
                accounts: {
                  '2': {
                    address: 'SomeSolanaAddress',
                    type: SolAccountType.DataAccount,
                  },
                },
              },
            },
          },
        },
      }),
    );

    const { getByText } = renderWithProviders(<SolanaNewFeatureContent />);

    await waitFor(() => {
      expect(getByText('solana_new_feature_content.learn_more')).toBeTruthy();
    });
    fireEvent.press(getByText('solana_new_feature_content.learn_more'));
    expect(mockNavigate).toHaveBeenCalledWith(
      SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE,
    );
  });
});
