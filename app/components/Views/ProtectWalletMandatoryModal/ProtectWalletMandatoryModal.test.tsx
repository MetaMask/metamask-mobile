import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProtectWalletMandatoryModal from './ProtectWalletMandatoryModal';

const mockNavigate = jest.fn();
const mockGetState = jest.fn(() => ({
  routes: [{ name: 'Home' }],
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    getState: mockGetState,
  }),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    WALLET_SECURITY_PROTECT_VIEWED: 'WALLET_SECURITY_PROTECT_VIEWED',
    WALLET_SECURITY_PROTECT_ENGAGED: 'WALLET_SECURITY_PROTECT_ENGAGED',
  },
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../core/Engine', () => ({
  hasFunds: jest.fn(() => true),
}));

jest.mock('react-native-modal', () => {
  const MockModal = ({
    children,
    isVisible,
    ...props
  }: {
    children: React.ReactNode;
    isVisible: boolean;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { View } = require('react-native');
    return isVisible ? (
      <View testID="modal-container" {...props}>
        {children}
      </View>
    ) : null;
  };
  MockModal.displayName = 'MockModal';
  return MockModal;
});

const createMockStore = (
  passwordSet = false,
  seedphraseBackedUp = false,
  isSeedlessOnboarding = false,
) =>
  configureStore({
    reducer: {
      user: () => ({
        passwordSet,
        seedphraseBackedUp,
      }),
      engine: () => ({
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {},
          },
          TokensController: {
            allTokens: {},
          },
          NftController: {
            allNfts: {},
          },
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: '0x123',
            },
          },
          SeedlessOnboardingController: {
            isSeedlessOnboardingLoginFlow: isSeedlessOnboarding,
          },
        },
      }),
    },
  });

describe('ProtectWalletMandatoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      routes: [{ name: 'Home' }],
    });
  });

  it('does not show modal when password is set and seedphrase is backed up', async () => {
    const store = createMockStore(true, true);

    const { queryByTestId } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal for seedless onboarding flow', async () => {
    const store = createMockStore(false, false, true);

    const { queryByTestId } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when on SetPasswordFlow route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'SetPasswordFlow' }],
    });

    const store = createMockStore(false, false);

    const { queryByTestId } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when on ChoosePassword route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'ChoosePassword' }],
    });

    const store = createMockStore(false, false);

    const { queryByTestId } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when on ManualBackupStep routes', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'ManualBackupStep1' }],
    });

    const store = createMockStore(true, false);

    const { queryByTestId } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('shows modal when password not set', async () => {
    const store = createMockStore(false, false);

    const { getByTestId } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('modal-container')).toBeTruthy();
    });
  });

  it('tracks WALLET_SECURITY_PROTECT_VIEWED event when modal is shown', async () => {
    const store = createMockStore(false, false);

    render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  it('navigates to SetPasswordFlow when Secure Wallet button is pressed', async () => {
    const store = createMockStore(false, false);

    const { getByText } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      const secureButton = getByText('Secure wallet');
      fireEvent.press(secureButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', undefined);
  });

  it('navigates to AccountBackupStep1 when password is already set', async () => {
    const store = createMockStore(true, false);

    const { getByText } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      const secureButton = getByText('Secure wallet');
      fireEvent.press(secureButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', {
      screen: 'AccountBackupStep1',
    });
  });

  it('shows password-specific message when password not set', async () => {
    const store = createMockStore(false, false);

    const { getByText } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        getByText(/create a password to protect your wallet/i),
      ).toBeTruthy();
    });
  });

  it('shows seedphrase-specific message when password is set but seedphrase not backed up', async () => {
    const store = createMockStore(true, false);

    const { getByText } = render(
      <Provider store={store}>
        <ProtectWalletMandatoryModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByText(/back up your Secret Recovery Phrase/i)).toBeTruthy();
    });
  });
});
