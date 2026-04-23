import React from 'react';
import ProtectYourWalletModal from './index';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { mockTheme, ThemeContext } from '../../../util/theme';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { ProtectWalletModalSelectorsIDs } from './ProtectWalletModal.testIds';
import { analytics } from '../../../util/analytics/analytics';

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockTrackEvent = jest.mocked(analytics.trackEvent);

const mockStore = configureMockStore();

const createInitialState = (overrides = {}) => ({
  user: {
    protectWalletModalVisible: true,
    passwordSet: true,
  },
  engine: {
    backgroundState: {
      SeedlessOnboardingController: {
        vault: null,
      },
    },
  },
  ...overrides,
});

const mockNavigation = {
  navigate: jest.fn(),
};

const renderModal = (storeOverride?: ReturnType<typeof mockStore>) => {
  const store = storeOverride ?? mockStore(createInitialState());
  return render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <ProtectYourWalletModal navigation={mockNavigation} />
      </ThemeContext.Provider>
    </Provider>,
  );
};

describe('ProtectYourWalletModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders modal title', () => {
      const { getByText } = renderModal();

      expect(
        getByText(strings('protect_wallet_modal.title')),
      ).toBeOnTheScreen();
    });

    it('renders top (protect) button', () => {
      const { getByText } = renderModal();

      expect(
        getByText(strings('protect_wallet_modal.top_button')),
      ).toBeOnTheScreen();
    });

    it('renders bottom (dismiss) button', () => {
      const { getByText } = renderModal();

      expect(
        getByText(strings('protect_wallet_modal.bottom_button')),
      ).toBeOnTheScreen();
    });

    it('renders learn more link', () => {
      const { getByTestId } = renderModal();

      expect(
        getByTestId(ProtectWalletModalSelectorsIDs.LEARN_MORE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('hides modal when seedless onboarding login flow is active', () => {
      const { queryByText } = renderWithProvider(<ProtectYourWalletModal />, {
        state: {
          ...createInitialState(),
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'Vault string',
              },
            },
          },
        },
      });

      expect(queryByText(strings('protect_wallet_modal.title'))).toBeNull();
    });
  });

  describe('learn more button', () => {
    it('navigates to support webview when pressed', async () => {
      const { getByTestId } = renderModal();

      const learnMoreButton = getByTestId(
        ProtectWalletModalSelectorsIDs.LEARN_MORE_BUTTON,
      );
      await act(async () => {
        fireEvent.press(learnMoreButton);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
          screen: 'SimpleWebview',
          params: {
            url: 'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/',
            title: strings('protect_wallet_modal.title'),
          },
        });
      });
    });
  });

  describe('protect button (cancel)', () => {
    it('tracks Wallet Security Reminder event when pressed', async () => {
      const { getByTestId } = renderModal();

      const cancelButton = getByTestId(
        ProtectWalletModalSelectorsIDs.CANCEL_BUTTON,
      );
      await act(async () => {
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Wallet Security Reminder Engaged',
            properties: { source: 'Modal', wallet_protection_required: false },
            saveDataRecording: false,
            sensitiveProperties: {},
          }),
        );
      });
    });

    it('navigates to AccountBackupStep1 when passwordSet is true', async () => {
      const { getByTestId } = renderModal();

      const cancelButton = getByTestId(
        ProtectWalletModalSelectorsIDs.CANCEL_BUTTON,
      );
      await act(async () => {
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          'SetPasswordFlow',
          { screen: 'AccountBackupStep1' },
        );
      });
    });

    it('navigates to SetPasswordFlow without screen param when passwordSet is false', async () => {
      const store = mockStore(
        createInitialState({
          user: {
            protectWalletModalVisible: true,
            passwordSet: false,
          },
        }),
      );
      const { getByTestId } = renderModal(store);

      const cancelButton = getByTestId(
        ProtectWalletModalSelectorsIDs.CANCEL_BUTTON,
      );
      await act(async () => {
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          'SetPasswordFlow',
          undefined,
        );
      });
    });
  });

  describe('dismiss button (confirm)', () => {
    it('dispatches protectWalletModalNotVisible action when pressed', async () => {
      const store = mockStore(createInitialState());
      const mockDispatch = jest.fn();
      store.dispatch = mockDispatch;
      const { getByTestId } = renderModal(store);

      const confirmButton = getByTestId(
        ProtectWalletModalSelectorsIDs.CONFIRM_BUTTON,
      );
      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });

    it('tracks analytics event when dismiss button is pressed', async () => {
      const { getByTestId } = renderModal();

      const confirmButton = getByTestId(
        ProtectWalletModalSelectorsIDs.CONFIRM_BUTTON,
      );
      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });
  });
});
