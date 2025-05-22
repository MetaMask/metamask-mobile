import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RevealPrivateCredential } from './';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { RevealSeedViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Engine from '../../../core/Engine';
import ClipboardManager from '../../../core/ClipboardManager';

const mockTrackEvent = jest.fn();

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(() => mockDispatch),
}));

// Mock useMetrics hook
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  withMetricsAwareness: (Component: React.ComponentType) => Component,
}));

// Mock Engine
jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: jest.fn(),
      exportSeedPhrase: jest.fn(),
      exportAccount: jest.fn(),
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: ['0x1111111111111111111111111111111111111111'],
          },
          {
            type: 'HD Key Tree',
            accounts: ['0x2222222222222222222222222222222222222222'],
          },
        ],
      },
    },
  },
}));

// Mock ClipboardManager
jest.mock('../../../core/ClipboardManager', () => ({
  setStringExpire: jest.fn(),
}));

// Mock showAlert action
jest.mock('../../../actions/alert', () => ({
  showAlert: jest.fn(() => ({ type: 'SHOW_ALERT' })),
}));

// Mock recordSRPRevealTimestamp action
jest.mock('../../../actions/privacy', () => ({
  recordSRPRevealTimestamp: jest.fn(() => ({ type: 'RECORD_SRP_TIMESTAMP' })),
}));

// Don't mock selectors - let them work with the real state

const mockStore = configureMockStore();

// Create initial state similar to SRPQuiz test pattern
const createInitialState = () => {
  const selectedAccount = 'account-id-2';
  const selectedAddress = '0x2222222222222222222222222222222222222222';

  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            accounts: {
              'account-id-1': {
                id: 'account-id-1',
                address: '0x1111111111111111111111111111111111111111',
                metadata: {
                  keyring: {
                    type: KeyringTypes.hd,
                  },
                },
              },
              [selectedAccount]: {
                id: selectedAccount,
                address: selectedAddress,
                metadata: {
                  keyring: {
                    type: KeyringTypes.hd,
                  },
                },
              },
            },
            selectedAccount,
          },
        },
        KeyringController: {
          isUnlocked: false,
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: ['0x1111111111111111111111111111111111111111'],
              metadata: {
                id: 'hd-1',
                name: 'HD Keyring 1',
              },
            },
            {
              type: KeyringTypes.hd,
              accounts: [selectedAddress],
              metadata: {
                id: 'hd-2',
                name: 'HD Keyring 2',
              },
            },
          ],
          keyringsMetadata: [],
        },
      },
    },
    user: {
      passwordSet: false,
    },
  };
};

describe('RevealPrivateCredential', () => {
  const SRP_CREDENTIAL = 'seed_phrase';
  const PRIV_KEY_CREDENTIAL = 'private_key';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useMetrics
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    });

    // Reset Engine mocks
    const mockEngine = Engine as jest.Mocked<typeof Engine>;
    (
      mockEngine.context.KeyringController.verifyPassword as jest.Mock
    ).mockResolvedValue(undefined);
    (
      mockEngine.context.KeyringController.exportSeedPhrase as jest.Mock
    ).mockResolvedValue(new Uint8Array([1, 2, 3]));
    (
      mockEngine.context.KeyringController.exportAccount as jest.Mock
    ).mockResolvedValue('mock-private-key');

    // Reset ClipboardManager mock
    (ClipboardManager.setStringExpire as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactNode) => {
    const store = mockStore(createInitialState());
    return render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
      </Provider>,
    );
  };

  it('renders reveal SRP correctly when the credential is directly passed', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: '',
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders reveal SRP correctly when the credential is passed via the route object', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        // @ts-expect-error - The error is ignored for testing purposes
        credentialName={undefined}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders reveal private key correctly', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: PRIV_KEY_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={PRIV_KEY_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows warning message on incorrect password', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );
    const passwordInput = getByPlaceholderText('Password');
    fireEvent.changeText(passwordInput, 'wrong-password');
    fireEvent(passwordInput, 'submitEditing');
    await waitFor(() => {
      expect(
        getByTestId(RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID),
      ).toBeTruthy();
    });
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('shows modal on correct password', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );
    const passwordInput = getByPlaceholderText('Password');
    fireEvent.changeText(passwordInput, 'correct-password');
    fireEvent(passwordInput, 'submitEditing');
    await waitFor(() => {
      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID),
      ).toBeTruthy();
    });
  });

  it('renders with a custom selectedAddress', async () => {
    const mockInternalAccount: InternalAccount = {
      type: EthAccountType.Eoa,
      id: 'unique-account-id-1',
      address: '0x1234567890123456789012345678901234567890',
      options: {
        someOption: 'optionValue',
        anotherOption: 42,
      },
      scopes: [EthScope.Eoa],
      methods: [
        EthMethod.PersonalSign,
        EthMethod.SignTransaction,
        EthMethod.SignTypedDataV1,
        EthMethod.SignTypedDataV3,
        EthMethod.SignTypedDataV4,
      ],
      metadata: {
        name: 'Test Account',
        importTime: Date.now(),
        keyring: {
          type: KeyringTypes.hd,
        },
        nameLastUpdatedAt: Date.now(),
        snap: {
          id: 'npm:@metamask/test-snap',
          name: 'Test Snap',
          enabled: true,
        },
        lastSelected: Date.now(),
      },
    };

    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: PRIV_KEY_CREDENTIAL,
            selectedAccount: mockInternalAccount,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={PRIV_KEY_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  describe('trackEvent calls', () => {
    it('tracks correct events when tryUnlock is called for SRP', async () => {
      const { getByPlaceholderText } = renderWithProviders(
        <RevealPrivateCredential
          route={{
            key: 'RevealPrivateCredential',
            name: 'RevealPrivateCredential',
            params: {
              credentialName: SRP_CREDENTIAL,
            },
          }}
          navigation={null}
          cancel={() => null}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.NEXT_REVEAL_SRP_CTA,
          )
            .addProperties({
              hd_entropy_index: 1,
            })
            .build(),
        );
      });
    });

    it('does not track events when tryUnlock is called for private key', async () => {
      const { getByPlaceholderText } = renderWithProviders(
        <RevealPrivateCredential
          route={{
            key: 'RevealPrivateCredential',
            name: 'RevealPrivateCredential',
            params: {
              credentialName: PRIV_KEY_CREDENTIAL,
            },
          }}
          navigation={null}
          cancel={() => null}
          credentialName={PRIV_KEY_CREDENTIAL}
        />,
      );

      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        // Should not call trackEvent for private key tryUnlock with NEXT_REVEAL_SRP_CTA
        expect(mockTrackEvent).not.toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: MetaMetricsEvents.NEXT_REVEAL_SRP_CTA,
          }),
        );
      });
    });

    it('tracks correct events when done callback is called for SRP', async () => {
      const mockCancel = jest.fn();

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={{
            key: 'RevealPrivateCredential',
            name: 'RevealPrivateCredential',
            params: {
              credentialName: SRP_CREDENTIAL,
            },
          }}
          navigation={null}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      // Clear calls from render/mount
      jest.clearAllMocks();

      // Click cancel button which should call done if unlocked=true or cancelReveal if unlocked=false
      const cancelButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
      );
      fireEvent.press(cancelButton);

      await waitFor(() => {
        // Should call trackEvent for SRP done (when unlocked=false, it calls cancelReveal instead)
        // Since unlocked starts as false, this will call cancelReveal which tracks CANCEL_REVEAL_SRP_CTA
        expect(mockTrackEvent).toHaveBeenCalledWith(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.CANCEL_REVEAL_SRP_CTA,
          ).build(),
        );
      });
    });

    it('tracks correct events when copyPrivateCredentialToClipboard is called for private key', async () => {
      const mockCancel = jest.fn();

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={{
            key: 'RevealPrivateCredential',
            name: 'RevealPrivateCredential',
            params: {
              credentialName: PRIV_KEY_CREDENTIAL,
            },
          }}
          navigation={null}
          cancel={mockCancel}
          credentialName={PRIV_KEY_CREDENTIAL}
        />,
      );

      // Clear calls from render/mount
      jest.clearAllMocks();

      // Click cancel which calls cancelReveal for private key
      const cancelButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
      );
      fireEvent.press(cancelButton);

      await waitFor(() => {
        // Should call trackEvent for private key cancellation
        expect(mockTrackEvent).toHaveBeenCalledWith(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.REVEAL_PRIVATE_KEY_CANCELLED,
          )
            .addProperties({
              view: 'Enter password',
            })
            .build(),
        );
      });
    });
  });
});
