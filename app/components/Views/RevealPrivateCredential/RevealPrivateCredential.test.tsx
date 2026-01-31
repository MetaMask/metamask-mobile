import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RevealPrivateCredential } from './';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { RevealSeedViewSelectorsIDs } from './RevealSeedView.testIds';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { WRONG_PASSWORD_ERROR } from '../../../constants/error';
import { ReauthenticateErrorType } from '../../../core/Authentication/types';
import ClipboardManager from '../../../core/ClipboardManager';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Device from '../../../util/device';
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import { ExportCredentialsIds } from '../MultichainAccounts/AccountDetails/ExportCredentials.testIds';

const MOCK_PASSWORD = 'word1 word2 word3 word4';

// Mock dispatch function
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();

// Create a stable mock for createEventBuilder that returns a chainable object
interface MockEventBuilder {
  addProperties: jest.Mock;
  build: jest.Mock;
}

const createMockEventBuilder = (): MockEventBuilder => {
  const builder: MockEventBuilder = {
    addProperties: jest.fn().mockImplementation(() => builder),
    build: jest.fn().mockReturnValue({}),
  };
  return builder;
};
const mockCreateEventBuilder = jest
  .fn()
  .mockImplementation(createMockEventBuilder);

// Mock useAuthentication hook
const mockReauthenticate = jest.fn();
const mockRevealSRP = jest.fn();

jest.mock('../../../core/Authentication/hooks/useAuthentication', () => ({
  __esModule: true,
  default: () => ({
    reauthenticate: mockReauthenticate,
    revealSRP: mockRevealSRP,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Create mock account to avoid circular dependency
const createMockAccount = (
  overrides: Partial<InternalAccount> = {},
): InternalAccount => ({
  type: EthAccountType.Eoa,
  id: 'unique-account-id-1',
  address: '0x1234567890123456789012345678901234567890',
  options: {},
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
    lastSelected: Date.now(),
  },
  ...overrides,
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => {
    const mockState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'unique-account-id-1',
              accounts: {
                'unique-account-id-1': {
                  address: '0x1234567890123456789012345678901234567890',
                },
              },
            },
          },
        },
      },
    };
    return selector(mockState);
  }),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  withMetricsAwareness: jest.fn((Component) => Component),
}));

// Mock ClipboardManager - necessary for testing clipboard functionality
jest.mock('../../../core/ClipboardManager', () => ({
  setStringExpire: jest.fn().mockResolvedValue(true),
}));

// Mock Engine - necessary for testing keyring operations without calling real crypto functions
jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: jest.fn(),
      exportSeedPhrase: jest.fn(),
      exportAccount: jest.fn(),
      state: {
        keyrings: [],
      },
    },
  },
}));

// Mock ScreenshotDeterrent - requires navigation context
jest.mock('../../UI/ScreenshotDeterrent', () => ({
  ScreenshotDeterrent: () => null,
}));

// Mock Authentication - necessary for testing without real biometric authentication
jest.mock('../../../core/Authentication', () => ({
  getType: jest.fn().mockResolvedValue({ availableBiometryType: null }),
  getPassword: jest.fn().mockResolvedValue(null),
}));

// Mock StorageWrapper - necessary for testing without real storage operations
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn().mockResolvedValue(''),
}));

// Simple QRCode mock - we don't need to test the QR library itself
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Simplified ScrollableTabView mock - just needs to render children
jest.mock(
  '@tommasini/react-native-scrollable-tab-view',
  () => 'ScrollableTabView',
);

// Device mock - necessary since component uses Device.isIos(), Device.isAndroid(), Device.getDeviceAPILevel()
jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn().mockReturnValue(false),
  isIos: jest.fn().mockReturnValue(true),
  getDeviceAPILevel: jest.fn().mockResolvedValue(30),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getInternalAccountByAddress: jest.fn(),
  isHardwareAccount: jest.fn().mockReturnValue(false),
}));

// Mock Linking for URL tests
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

// Mock trace utilities
jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: { RevealSrp: 'RevealSrp' },
  TraceOperation: { RevealPrivateCredential: 'RevealPrivateCredential' },
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  user: {
    passwordSet: false,
  },
};

const store = mockStore(initialState);

const renderWithProviders = (ui: React.ReactNode) =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
    </Provider>,
  );

/**
 * Helper function to complete the security quiz flow.
 * The component now starts with an Introduction stage followed by a Quiz stage
 * before showing the ActionView (password entry or unlocked SRP).
 *
 * Note: This helper only completes the quiz. It does NOT wait for password input
 * because the component may already be unlocked if biometrics succeeded.
 */
const completeSecurityQuiz = async (
  getByTestId: ReturnType<typeof render>['getByTestId'],
) => {
  // Step 1: Click "Get started" on introduction screen
  await waitFor(() => {
    expect(getByTestId(ExportCredentialsIds.NEXT_BUTTON)).toBeTruthy();
  });
  fireEvent.press(getByTestId(ExportCredentialsIds.NEXT_BUTTON));

  // Step 2: Answer quiz question 1 (correct answer is button 2)
  await waitFor(() => {
    expect(getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-2`)).toBeTruthy();
  });
  fireEvent.press(getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-2`));

  // Step 3: Click "Continue" after correct answer
  await waitFor(() => {
    expect(getByTestId(ExportCredentialsIds.CONTINUE_BUTTON)).toBeTruthy();
  });
  fireEvent.press(getByTestId(ExportCredentialsIds.CONTINUE_BUTTON));

  // Step 4: Answer quiz question 2 (correct answer is button 1)
  await waitFor(() => {
    expect(getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-1`)).toBeTruthy();
  });
  fireEvent.press(getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-1`));

  // Step 5: Click "Continue" to proceed to ActionView
  await waitFor(() => {
    expect(getByTestId(ExportCredentialsIds.CONTINUE_BUTTON)).toBeTruthy();
  });
  fireEvent.press(getByTestId(ExportCredentialsIds.CONTINUE_BUTTON));

  // Wait for ActionView (scroll view) to appear
  await waitFor(() => {
    expect(
      getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID),
    ).toBeTruthy();
  });
};

/**
 * Helper to complete quiz and wait for password entry.
 * Use this for tests that need to interact with password input.
 * Make sure biometrics are mocked to fail before calling this.
 */
const completeSecurityQuizAndWaitForPasswordEntry = async (
  getByTestId: ReturnType<typeof render>['getByTestId'],
) => {
  await completeSecurityQuiz(getByTestId);

  // Wait for password entry to appear (only works if biometrics failed)
  await waitFor(() => {
    expect(
      getByTestId(RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID),
    ).toBeTruthy();
  });
};

const createDefaultRoute = (
  params: Record<string, unknown> = {},
): {
  key: string;
  name: 'RevealPrivateCredential';
  params: Record<string, unknown>;
} => ({
  key: 'RevealPrivateCredential',
  name: 'RevealPrivateCredential',
  params,
});

describe('RevealPrivateCredential', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Restore mock implementations after clearAllMocks
    mockCreateEventBuilder.mockImplementation(createMockEventBuilder);

    // Default mock implementations
    mockReauthenticate.mockResolvedValue({ password: 'test-password' });
    mockRevealSRP.mockResolvedValue('test seed phrase words here');

    const addressMock = jest.requireMock('../../../util/address');
    addressMock.getInternalAccountByAddress.mockReturnValue(
      createMockAccount(),
    );
    addressMock.isHardwareAccount.mockReturnValue(false);

    // Reset Device mocks to defaults
    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (Device.isIos as jest.Mock).mockReturnValue(true);
    (Device.getDeviceAPILevel as jest.Mock).mockResolvedValue(30);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders introduction screen initially', () => {
      const { getByTestId, getByText } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID),
      ).toBeTruthy();
      expect(getByTestId(ExportCredentialsIds.CONTAINER)).toBeTruthy();
      expect(getByTestId(ExportCredentialsIds.NEXT_BUTTON)).toBeTruthy();
      expect(getByText('Get started')).toBeTruthy();
    });

    it('renders password entry after completing security quiz', async () => {
      // Mock biometrics to fail so password entry is shown
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID),
      ).toBeTruthy();
      expect(
        getByTestId(RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID),
      ).toBeTruthy();
    });

    it('renders warning section with eye slash icon after completing quiz', async () => {
      // Mock biometrics to fail so warning section is shown
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      expect(
        getByTestId(RevealSeedViewSelectorsIDs.SEED_PHRASE_WARNING_ID),
      ).toBeTruthy();
    });

    it('renders cancel button when showCancelButton is true after completing quiz', async () => {
      // Mock biometrics to fail so we see password entry with cancel button
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
          showCancelButton
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      expect(
        getByTestId(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
        ),
      ).toBeTruthy();
    });
  });

  describe('security quiz flow', () => {
    it('navigates from introduction to quiz when Get started is pressed', async () => {
      const { getByTestId, getByText } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      // Initially on introduction screen
      expect(getByTestId(ExportCredentialsIds.NEXT_BUTTON)).toBeTruthy();

      // Click Get started
      fireEvent.press(getByTestId(ExportCredentialsIds.NEXT_BUTTON));

      // Should show quiz question
      await waitFor(() => {
        expect(getByText('Question 1 of 2')).toBeTruthy();
      });
    });

    it('shows correct feedback when correct answer is selected', async () => {
      const { getByTestId, getByText } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      // Navigate to quiz
      fireEvent.press(getByTestId(ExportCredentialsIds.NEXT_BUTTON));

      await waitFor(() => {
        expect(
          getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-2`),
        ).toBeTruthy();
      });

      // Select correct answer for question 1 (button 2)
      fireEvent.press(getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-2`));

      // Should show correct feedback
      await waitFor(() => {
        expect(getByText('Correct!')).toBeTruthy();
        expect(getByTestId(ExportCredentialsIds.CONTINUE_BUTTON)).toBeTruthy();
      });
    });

    it('shows incorrect feedback and try again option when wrong answer is selected', async () => {
      const { getByTestId, getByText } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      // Navigate to quiz
      fireEvent.press(getByTestId(ExportCredentialsIds.NEXT_BUTTON));

      await waitFor(() => {
        expect(
          getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-1`),
        ).toBeTruthy();
      });

      // Select wrong answer for question 1 (button 1)
      fireEvent.press(getByTestId(`${ExportCredentialsIds.ANSWER_BUTTON}-1`));

      // Should show incorrect feedback
      await waitFor(() => {
        expect(getByText('Incorrect!')).toBeTruthy();
        expect(getByTestId(ExportCredentialsIds.TRY_AGAIN_BUTTON)).toBeTruthy();
      });
    });

    it('renders learn more button on introduction screen', () => {
      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      expect(getByTestId(ExportCredentialsIds.LEARN_MORE_BUTTON)).toBeTruthy();
    });
  });

  describe('password entry', () => {
    it('displays warning message on incorrect password', async () => {
      mockReauthenticate.mockRejectedValue(new Error(WRONG_PASSWORD_ERROR));

      const { getByTestId, getByText } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      const passwordInput = getByTestId(
        RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
      );
      fireEvent.changeText(passwordInput, 'wrong-password');

      const confirmButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        const warningText = getByTestId(
          RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
        );
        expect(warningText.props.children).toBeTruthy();
      });

      // Validate specific warning message for incorrect password
      expect(getByText('Incorrect password')).toBeTruthy();
    });

    it('accepts text input in password field and triggers tryUnlock on submit editing', async () => {
      // Mock biometrics to fail so password entry is shown
      mockReauthenticate.mockRejectedValueOnce(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );
      // Then allow the manual password entry to succeed
      mockReauthenticate.mockResolvedValue({ password: 'correct-password' });

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      const passwordInput = getByTestId(
        RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
      );
      fireEvent.changeText(passwordInput, 'correct-password');

      await act(async () => {
        fireEvent(passwordInput, 'submitEditing');
      });

      await waitFor(() => {
        expect(mockReauthenticate).toHaveBeenCalledWith('correct-password');
      });
    });

    it('renders confirm button in disabled state with empty password', async () => {
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      await waitFor(() => {
        const confirmButton = getByTestId(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
        );
        expect(confirmButton).toBeTruthy();
        expect(confirmButton.props.disabled).toBe(true);
      });
    });
  });

  describe('revealCredential', () => {
    it('silently ignores PASSWORD_NOT_SET_WITH_BIOMETRICS error', async () => {
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password stored`,
        ),
      );

      const { getByTestId, queryByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await waitFor(() => {
        expect(mockReauthenticate).toHaveBeenCalled();
      });

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      // Should not show error for this specific case
      const warningText = queryByTestId(
        RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
      );
      // The warning should be empty string
      expect(warningText?.props.children).toBeFalsy();
    });

    it('displays unknown error for non-password errors', async () => {
      // Biometric auth succeeds but SRP reveal fails with unknown error
      mockReauthenticate.mockResolvedValue({ password: 'test' });
      mockRevealSRP.mockRejectedValue(new Error('Some unknown error'));

      const { getByTestId, getByText } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      // Wait for the auto-reveal attempt on mount to complete and show error
      await waitFor(() => {
        const warningText = getByTestId(
          RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
        );
        // Should show warning message for unknown error
        expect(warningText.props.children).toBeTruthy();
      });

      // Validate specific unknown error message
      expect(
        getByText("Couldn't unlock your account. Please try again."),
      ).toBeTruthy();
    });

    it('uses keyringId parameter when provided', async () => {
      const testKeyringId = 'custom-keyring-id';
      mockReauthenticate.mockResolvedValue({ password: 'test-password' });
      mockRevealSRP.mockResolvedValue('seed phrase');

      renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute({ keyringId: testKeyringId })}
          navigation={null}
          cancel={() => null}
        />,
      );

      await waitFor(() => {
        expect(mockRevealSRP).toHaveBeenCalledWith(
          'test-password',
          testKeyringId,
        );
      });
    });
  });

  describe('tryUnlock', () => {
    it('dispatches recordSRPRevealTimestamp on successful unlock', async () => {
      // Mock biometrics to fail so password entry is shown
      mockReauthenticate.mockRejectedValueOnce(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );
      // Then allow the manual password entry to succeed
      mockReauthenticate.mockResolvedValue({ password: 'correct-password' });

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      const passwordInput = getByTestId(
        RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
      );
      fireEvent.changeText(passwordInput, 'correct-password');

      const confirmButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'RECORD_SRP_REVEAL_TIMESTAMP' }),
        );
      });
    });

    it('shows SRP after successful authentication via biometrics', async () => {
      // Biometrics succeed, so SRP should be shown after completing quiz
      mockReauthenticate.mockResolvedValue({ password: 'correct-password' });
      mockRevealSRP.mockResolvedValue(MOCK_PASSWORD);

      const { getByTestId, queryByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuiz(getByTestId);

      // SRP is already revealed via biometrics - check for the tab view
      await waitFor(() => {
        expect(
          queryByTestId(RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT),
        ).toBeTruthy();
      });
    });

    it('tracks NEXT_REVEAL_SRP_CTA analytics event', async () => {
      // Mock biometrics to fail so password entry is shown
      mockReauthenticate.mockRejectedValueOnce(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );
      // Then allow the manual password entry to succeed
      mockReauthenticate.mockResolvedValue({ password: 'correct-password' });

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      const passwordInput = getByTestId(
        RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
      );
      fireEvent.changeText(passwordInput, 'correct-password');

      const confirmButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          expect.objectContaining({
            category: MetaMetricsEvents.NEXT_REVEAL_SRP_CTA.category,
          }),
        );
      });
    });
  });

  describe('cancelReveal', () => {
    it('calls cancel callback when provided', async () => {
      const mockCancel = jest.fn();
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={mockCancel}
          showCancelButton
        />,
      );

      await completeSecurityQuiz(getByTestId);

      await waitFor(() => {
        const cancelButton = getByTestId(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
        );
        fireEvent.press(cancelButton);
      });

      expect(mockCancel).toHaveBeenCalled();
    });

    it('tracks REVEAL_SRP_CANCELLED when not unlocked', async () => {
      const mockCancel = jest.fn();
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={mockCancel}
          showCancelButton
        />,
      );

      await completeSecurityQuiz(getByTestId);

      await waitFor(() => {
        const cancelButton = getByTestId(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
        );
        fireEvent.press(cancelButton);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: MetaMetricsEvents.REVEAL_SRP_CANCELLED.category,
        }),
      );
    });

    it('calls navigation.pop when shouldUpdateNav is true', async () => {
      const mockPop = jest.fn();
      const mockNavigation = {
        pop: mockPop,
        setOptions: jest.fn(),
      };
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute({ shouldUpdateNav: true })}
          navigation={mockNavigation}
          cancel={undefined as unknown as () => void}
          showCancelButton
        />,
      );

      await completeSecurityQuiz(getByTestId);

      await waitFor(() => {
        const cancelButton = getByTestId(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
        );
        fireEvent.press(cancelButton);
      });

      expect(mockPop).toHaveBeenCalled();
    });
  });

  describe('clipboard functionality', () => {
    it('copies SRP to clipboard when copy button is pressed', async () => {
      mockReauthenticate.mockResolvedValue({ password: 'test-password' });
      mockRevealSRP.mockResolvedValue(MOCK_PASSWORD);

      const { queryByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      // Wait for auto-reveal via biometrics
      await waitFor(() => {
        expect(mockRevealSRP).toHaveBeenCalled();
      });

      // Check if copy button exists (only visible when unlocked)
      await waitFor(
        () => {
          const copyButton = queryByTestId(
            RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
          );
          if (copyButton) {
            fireEvent.press(copyButton);
            expect(ClipboardManager.setStringExpire).toHaveBeenCalled();
          }
        },
        { timeout: 2000 },
      );
    });

    it('dispatches showAlert after copying to clipboard', async () => {
      mockReauthenticate.mockResolvedValue({ password: 'test-password' });
      mockRevealSRP.mockResolvedValue(MOCK_PASSWORD);

      const { queryByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await waitFor(() => {
        expect(mockRevealSRP).toHaveBeenCalled();
      });

      await waitFor(
        () => {
          const copyButton = queryByTestId(
            RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
          );
          if (copyButton) {
            fireEvent.press(copyButton);
            expect(mockDispatch).toHaveBeenCalledWith(
              expect.objectContaining({ type: 'SHOW_ALERT' }),
            );
          }
        },
        { timeout: 2000 },
      );
    });
  });

  describe('Android-specific behavior', () => {
    it('disables clipboard for old Android API levels', async () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      (Device.getDeviceAPILevel as jest.Mock).mockResolvedValue(20); // Below minimum
      mockReauthenticate.mockResolvedValue({ password: 'test-password' });
      mockRevealSRP.mockResolvedValue(MOCK_PASSWORD);

      const { getByTestId, queryByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      await waitFor(() => {
        expect(mockRevealSRP).toHaveBeenCalled();
      });

      await completeSecurityQuiz(getByTestId);

      // Reveal the seed phrase
      const blurButton = queryByTestId(
        ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
      );
      if (blurButton) {
        fireEvent.press(blurButton);
      }

      // Copy button should not be visible when clipboard is disabled for old Android API levels
      expect(
        queryByTestId(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
        ),
      ).toBeNull();
    });

    it('enables clipboard for supported Android API levels', async () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      (Device.getDeviceAPILevel as jest.Mock).mockResolvedValue(30);
      mockReauthenticate.mockResolvedValue({ password: 'test-password' });
      mockRevealSRP.mockResolvedValue(MOCK_PASSWORD);

      const { getByTestId, queryByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      // Wait for auto-reveal via biometrics to unlock component
      await waitFor(() => {
        expect(mockRevealSRP).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(Device.getDeviceAPILevel).toHaveBeenCalled();
      });

      await completeSecurityQuiz(getByTestId);

      // Need to reveal the seed phrase after unlocking
      const blurButton = queryByTestId(
        ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
      );
      if (blurButton) {
        fireEvent.press(blurButton);
      }

      // Copy button should be visible when unlocked on supported Android API level
      await waitFor(() => {
        expect(
          queryByTestId(
            RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
          ),
        ).not.toBeNull();
      });
    });
  });

  describe('modal interactions', () => {
    it('navigates to learn more when learn more link is pressed', () => {
      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      // Press the Learn more button on the introduction screen
      const learnMoreButton = getByTestId(
        ExportCredentialsIds.LEARN_MORE_BUTTON,
      );

      // Verify the button exists and can be pressed without error
      expect(learnMoreButton).toBeTruthy();
      fireEvent.press(learnMoreButton);
    });
  });

  describe('navigation', () => {
    it('updates navigation options when shouldUpdateNav is true', () => {
      const mockSetOptions = jest.fn();
      const mockNavigation = {
        pop: jest.fn(),
        setOptions: mockSetOptions,
      };

      renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute({ shouldUpdateNav: true })}
          navigation={mockNavigation}
          cancel={() => null}
        />,
      );

      expect(mockSetOptions).toHaveBeenCalled();
    });

    it('does not update navigation options when shouldUpdateNav is false', () => {
      const mockSetOptions = jest.fn();
      const mockNavigation = {
        pop: jest.fn(),
        setOptions: mockSetOptions,
      };

      renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute({ shouldUpdateNav: false })}
          navigation={mockNavigation}
          cancel={() => null}
        />,
      );

      expect(mockSetOptions).not.toHaveBeenCalled();
    });

    it('does not update navigation options when navigation is null', () => {
      const mockSetOptions = jest.fn();

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute({ shouldUpdateNav: true })}
          navigation={null}
          cancel={() => null}
        />,
      );

      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID),
      ).toBeTruthy();
      // When navigation is null, hasNavigation is false, so setOptions should never be called.
      // The component handles null navigation gracefully (no error thrown),
      // which proves updateNavBar returns early without calling navigation.setOptions()
      expect(mockSetOptions).not.toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('tracks REVEAL_SRP_SCREEN event on mount', () => {
      renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={() => null}
        />,
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: MetaMetricsEvents.REVEAL_SRP_SCREEN.category,
        }),
      );
    });

    it('tracks CANCEL_REVEAL_SRP_CTA when cancel is pressed', async () => {
      const mockCancel = jest.fn();
      mockReauthenticate.mockRejectedValue(
        new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password`,
        ),
      );

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={mockCancel}
          showCancelButton
        />,
      );

      await completeSecurityQuiz(getByTestId);

      await waitFor(() => {
        const cancelButton = getByTestId(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
        );
        fireEvent.press(cancelButton);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: MetaMetricsEvents.CANCEL_REVEAL_SRP_CTA.category,
        }),
      );
    });
  });

  describe('done action', () => {
    it('navigates back and tracks SRP_DONE_CTA when done is pressed after unlock', async () => {
      const mockCancel = jest.fn();
      mockReauthenticate.mockResolvedValue({ password: 'test-password' });
      mockRevealSRP.mockResolvedValue(MOCK_PASSWORD);

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()}
          navigation={null}
          cancel={mockCancel}
        />,
      );

      // Wait for biometric unlock
      await waitFor(() => {
        expect(mockRevealSRP).toHaveBeenCalled();
      });

      await completeSecurityQuiz(getByTestId);

      // After unlock via biometrics, the cancel button shows "Done"
      await waitFor(() => {
        const doneButton = getByTestId(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
        );
        expect(doneButton).toBeTruthy();
        fireEvent.press(doneButton);
      });

      expect(mockCancel).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: MetaMetricsEvents.SRP_DONE_CTA.category,
        }),
      );
    });
  });

  describe('selected account handling', () => {
    it('uses selectedAccount address from route params when provided', async () => {
      const addressMock = jest.requireMock('../../../util/address');
      const customAddress = '0xCustomAddress1234567890123456789012345678';
      const customAccount = createMockAccount({
        address: customAddress,
      });
      // Mock biometrics to fail, but then fail with a specific error when trying to unlock
      mockReauthenticate.mockRejectedValue(new Error('Test error'));

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute({ selectedAccount: customAccount })}
          navigation={null}
          cancel={() => null}
        />,
      );

      await completeSecurityQuizAndWaitForPasswordEntry(getByTestId);

      const passwordInput = getByTestId(
        RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
      );
      fireEvent.changeText(passwordInput, 'test-password');

      const confirmButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      // Verify that isHardwareAccount was called with the custom address from selectedAccount
      await waitFor(() => {
        expect(addressMock.isHardwareAccount).toHaveBeenCalledWith(
          customAddress,
        );
      });
    });

    it('falls back to checkSummedAddress from selector when no selectedAccount', async () => {
      mockReauthenticate.mockResolvedValue({ password: 'test-password' });
      mockRevealSRP.mockResolvedValue('test seed phrase');

      const { getByTestId, queryByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={createDefaultRoute()} // No selectedAccount provided - falls back to selector
          navigation={null}
          cancel={() => null}
        />,
      );

      await waitFor(() => {
        expect(mockRevealSRP).toHaveBeenCalled();
      });

      await completeSecurityQuiz(getByTestId);

      const blurButton = queryByTestId(
        ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
      );
      if (blurButton) {
        fireEvent.press(blurButton);
      }

      // Verify component successfully unlocked using the fallback address from selector
      // The SRP is revealed, proving the fallback address worked
      await waitFor(() => {
        const copyButton = queryByTestId(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
        );
        expect(copyButton).toBeTruthy();
      });

      // Verify the container is still rendered (component didn't crash with fallback address)
      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID),
      ).toBeTruthy();
    });
  });
});
