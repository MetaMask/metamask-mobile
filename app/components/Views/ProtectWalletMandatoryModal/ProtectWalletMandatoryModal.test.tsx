import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { InteractionManager } from 'react-native';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';

type RunAfterInteractionsTask = NonNullable<
  Parameters<typeof InteractionManager.runAfterInteractions>[0]
>;
import ProtectWalletMandatoryModal from './ProtectWalletMandatoryModal';
import { ThemeContext, mockTheme } from '../../../util/theme';

const mockNavigate = jest.fn();

interface MockNavigationState {
  routes: { name: string }[];
}

const mockGetState = jest.fn((): MockNavigationState | undefined => ({
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
  addSensitiveProperties: jest.fn().mockReturnThis(),
  removeProperties: jest.fn().mockReturnThis(),
  removeSensitiveProperties: jest.fn().mockReturnThis(),
  setSaveDataRecording: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics');

const mockHasFunds = jest.fn(() => true);
jest.mock('../../../core/Engine', () => ({
  hasFunds: () => mockHasFunds(),
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
            vault: isSeedlessOnboarding ? 'mock-vault' : null,
          },
        },
      }),
    },
  });

const renderWithTheme = (
  component: React.ReactElement,
  store: ReturnType<typeof createMockStore>,
) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <Provider store={store}>{component}</Provider>
    </ThemeContext.Provider>,
  );

describe('ProtectWalletMandatoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    mockGetState.mockReturnValue({
      routes: [{ name: 'Home' }],
    });
    mockHasFunds.mockReturnValue(true);
  });

  it('does not show modal when password is set and seedphrase is backed up', async () => {
    const store = createMockStore(true, true);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal for seedless onboarding flow', async () => {
    const store = createMockStore(false, false, true);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
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

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
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

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
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

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('shows modal when password not set', async () => {
    const store = createMockStore(false, false);

    const { getByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(getByTestId('modal-container')).toBeTruthy();
    });
  });

  it('tracks WALLET_SECURITY_PROTECT_VIEWED event when modal is shown', async () => {
    const store = createMockStore(false, false);

    renderWithTheme(<ProtectWalletMandatoryModal />, store);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  it('navigates to SetPasswordFlow when Secure Wallet button is pressed', async () => {
    const store = createMockStore(false, false);

    const { getByText } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      const secureButton = getByText('Protect wallet');
      fireEvent.press(secureButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', undefined);
  });

  it('tracks WALLET_SECURITY_PROTECT_ENGAGED after interactions when Secure Wallet is pressed', async () => {
    const runAfterSpy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task?: RunAfterInteractionsTask) => {
        if (typeof task === 'function') {
          task();
        } else if (task !== undefined) {
          Promise.resolve(task.gen()).catch(() => undefined);
        }
        return {
          then: (onfulfilled?: () => unknown, onrejected?: () => unknown) =>
            Promise.resolve(undefined).then(onfulfilled, onrejected),
          done: jest.fn(),
          cancel: jest.fn(),
        };
      });
    const store = createMockStore(false, false);

    const { getByText } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      fireEvent.press(getByText('Protect wallet'));
    });

    await waitFor(() => {
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Wallet Security Reminder Engaged',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    runAfterSpy.mockRestore();
  });

  it('navigates to AccountBackupStep1 when password is already set', async () => {
    const store = createMockStore(true, false);

    const { getByText } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      const secureButton = getByText('Protect wallet');
      fireEvent.press(secureButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', {
      screen: 'AccountBackupStep1',
    });
  });

  it('shows password-specific message when password not set', async () => {
    const store = createMockStore(false, false);

    const { getByText } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(
        getByText(/Protect your wallet by setting a password/i),
      ).toBeTruthy();
    });
  });

  it('shows seedphrase-specific message when password is set but seedphrase not backed up', async () => {
    const store = createMockStore(true, false);

    const { getByText } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(
        getByText(/now that value was added to your wallet/i),
      ).toBeTruthy();
    });
  });

  it('does not show modal when on AccountBackupStep1B route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'AccountBackupStep1B' }],
    });

    const store = createMockStore(true, false);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when on ManualBackupStep2 route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'ManualBackupStep2' }],
    });

    const store = createMockStore(true, false);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when on ManualBackupStep3 route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'ManualBackupStep3' }],
    });

    const store = createMockStore(true, false);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when on Webview route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'Webview' }],
    });

    const store = createMockStore(true, false);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when user has no funds and password is set', async () => {
    mockHasFunds.mockReturnValue(false);
    const store = createMockStore(true, false);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('shows modal when user has funds and seedphrase not backed up', async () => {
    mockHasFunds.mockReturnValue(true);
    const store = createMockStore(true, false);

    const { getByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(getByTestId('modal-container')).toBeTruthy();
    });
  });

  it('shows modal when password not set and user has no funds', async () => {
    mockHasFunds.mockReturnValue(false);
    const store = createMockStore(false, false);

    const { getByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(getByTestId('modal-container')).toBeTruthy();
    });
  });

  it('does not show modal when on AccountBackupStep1 route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'AccountBackupStep1' }],
    });

    const store = createMockStore(false, false);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('does not show modal when on LockScreen route', async () => {
    mockGetState.mockReturnValue({
      routes: [{ name: 'LockScreen' }],
    });

    const store = createMockStore(false, false);

    const { queryByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });
  });

  it('displays correct title text', async () => {
    const store = createMockStore(false, false);

    const { getByText } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(getByText('Protect your wallet')).toBeTruthy();
    });
  });

  it('re-evaluates modal visibility when token balance changes', async () => {
    mockHasFunds.mockReturnValue(false);
    const store = createMockStore(true, false);

    const { queryByTestId, rerender } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeNull();
    });

    mockHasFunds.mockReturnValue(true);
    const storeWithFunds = createMockStore(true, false);

    rerender(
      <ThemeContext.Provider value={mockTheme}>
        <Provider store={storeWithFunds}>
          <ProtectWalletMandatoryModal />
        </Provider>
      </ThemeContext.Provider>,
    );

    await waitFor(() => {
      expect(queryByTestId('modal-container')).toBeTruthy();
    });
  });

  it('does not crash when getState returns undefined', async () => {
    mockGetState.mockReturnValue(undefined);
    const store = createMockStore(false, false);

    const { getByTestId } = renderWithTheme(
      <ProtectWalletMandatoryModal />,
      store,
    );

    await waitFor(() => {
      expect(getByTestId('modal-container')).toBeTruthy();
    });
  });
});
