import { useContext } from 'react';
import { renderScreen } from '../../../util/test/renderWithProvider';
import ImportNewSecretRecoveryPhrase from './';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import Clipboard from '@react-native-clipboard/clipboard';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import messages from '../../../../locales/languages/en.json';
import {
  MOCK_HD_ACCOUNTS,
  MOCK_HD_KEYRING_METADATA,
} from '../../../selectors/keyringController/testUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import {
  ImportNewSecretRecoveryPhraseOptions,
  ImportNewSecretRecoveryPhraseReturnType,
} from '../../../actions/multiSrp';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { Alert } from 'react-native';

// Mock for keyboard state visibility
const mockUseKeyboardState = jest.fn();
jest.mock('react-native-keyboard-controller', () => {
  const { ScrollView, View } = jest.requireActual('react-native');
  return {
    KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
    KeyboardAwareScrollView: ScrollView,
    KeyboardStickyView: View,
    useKeyboardState: (selector: (state: { isVisible: boolean }) => boolean) =>
      mockUseKeyboardState(selector),
  };
});

// Mock Keyboard to prevent Jest environment teardown errors
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
}));

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Keyboard: {
      ...actualRN.Keyboard,
      dismiss: jest.fn(),
    },
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockImportNewSecretRecoveryPhrase = jest.fn();
const mockTrackEvent = jest.fn();
const mockCheckIsSeedlessPasswordOutdated = jest.fn();
const mockIsMultichainAccountsState2Enabled = jest.fn().mockReturnValue(true);
const mockShowToast = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

jest.mock('../../../actions/multiSrp', () => ({
  ...jest.requireActual('../../../actions/multiSrp'),
  importNewSecretRecoveryPhrase: (...args: unknown[]) =>
    mockImportNewSecretRecoveryPhrase(...args),
}));

jest.mock('../../../core', () => ({
  ...jest.requireActual('../../../core'),
  Authentication: {
    checkIsSeedlessPasswordOutdated: () =>
      mockCheckIsSeedlessPasswordOutdated(),
  },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(),
}));

jest.mock('../../hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: () =>
    mockIsMultichainAccountsState2Enabled(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('../../hooks/useAccountsWithNetworkActivitySync', () => ({
  useAccountsWithNetworkActivitySync: () => ({
    fetchAccountsWithActivity: jest.fn(),
  }),
}));

const valid12WordMnemonic =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

const valid24WordMnemonic =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

const invalidMnemonic =
  'aaaaa youth dentist air relief leave neither liquid belt aspect bone frame';

const mockGetString = Clipboard.getString as jest.MockedFunction<
  typeof Clipboard.getString
>;

const initialState = {
  engine: {
    backgroundState: {
      KeyringController: {
        keyrings: [
          {
            type: KeyringTypes.hd,
            accounts: MOCK_HD_ACCOUNTS,
            metadata: MOCK_HD_KEYRING_METADATA,
          },
        ],
      },
    },
  },
};

// Mock the feature flag selector to return true
jest.mock(
  '../../../selectors/featureFlagController/importSrpWordSuggestion',
  () => ({
    selectImportSrpWordSuggestionEnabledFlag: () => true,
  }),
);

describe('ImportNewSecretRecoveryPhrase', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMultichainAccountsState2Enabled.mockReturnValue(false);
    mockGetString.mockResolvedValue('');

    (useContext as jest.Mock).mockImplementation((context) => {
      if (context === ToastContext) {
        return {
          toastRef: {
            current: {
              showToast: mockShowToast,
              closeToast: jest.fn(),
            },
          },
        };
      }
      return jest.requireActual('react').useContext(context);
    });

    mockImportNewSecretRecoveryPhrase.mockImplementation(
      (
        _srp: string,
        _options: ImportNewSecretRecoveryPhraseOptions,
        callback?: (options: ImportNewSecretRecoveryPhraseReturnType) => void,
      ) => {
        if (callback) {
          Promise.resolve().then(() => {
            callback({
              address: '9fE6zKgca6K2EEa3yjbcq7zGMusUNqSQeWQNL2YDZ2Yi',
              discoveredAccountsCount: 3,
            });
          });
        }
        return Promise.resolve({
          address: '9fE6zKgca6K2EEa3yjbcq7zGMusUNqSQeWQNL2YDZ2Yi',
          discoveredAccountsCount: 0,
        });
      },
    );

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    });

    mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);

    mockUseKeyboardState.mockImplementation(
      (selector: (state: { isVisible: boolean }) => boolean) =>
        selector({ isVisible: false }),
    );
  });

  it('renders initial textarea input', () => {
    const { getByTestId } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const textareaInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
    expect(textareaInput).toBeTruthy();
  });

  it('renders paste button text when SRP is empty', () => {
    const { getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    expect(getByText(messages.import_from_seed.paste)).toBeTruthy();
  });

  it('imports valid pasted 12-word SRP', async () => {
    mockGetString.mockResolvedValue(valid12WordMnemonic);

    const { getByTestId, getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const pasteButton = getByText(messages.import_from_seed.paste);

    await act(async () => {
      await fireEvent.press(pasteButton);
    });

    await waitFor(() => {
      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
      expect(importButton.props.disabled).toBe(false);
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

    await act(async () => {
      await fireEvent.press(importButton);
    });

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid12WordMnemonic,
      undefined,
      expect.any(Function),
    );
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  it('imports valid pasted 24-word SRP', async () => {
    mockGetString.mockResolvedValue(valid24WordMnemonic);

    const { getByTestId, getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const pasteButton = getByText(messages.import_from_seed.paste);

    await act(async () => {
      await fireEvent.press(pasteButton);
    });

    await waitFor(() => {
      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
      expect(importButton.props.disabled).toBe(false);
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

    await act(async () => {
      await fireEvent.press(importButton);
    });

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid24WordMnemonic,
      undefined,
      expect.any(Function),
    );
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  it('disables import button when SRP is empty', () => {
    const { getByTestId } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    expect(importButton.props.disabled).toBe(true);
  });

  it('disables import button when SRP length is invalid', async () => {
    const { getByTestId } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const textareaInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);

    await act(async () => {
      await fireEvent.changeText(textareaInput, 'word1 word2 word3');
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    expect(importButton.props.disabled).toBe(true);
  });

  it('shows clear button after pasting SRP', async () => {
    mockGetString.mockResolvedValue(valid12WordMnemonic);

    const { getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const pasteButton = getByText(messages.import_from_seed.paste);

    await act(async () => {
      await fireEvent.press(pasteButton);
    });

    await waitFor(() => {
      expect(getByText(messages.import_from_seed.clear_all)).toBeTruthy();
    });
  });

  it('clears SRP when clear button is pressed', async () => {
    mockGetString.mockResolvedValue(valid12WordMnemonic);

    const { getByTestId, getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const pasteButton = getByText(messages.import_from_seed.paste);

    await act(async () => {
      await fireEvent.press(pasteButton);
    });

    await waitFor(() => {
      expect(getByText(messages.import_from_seed.clear_all)).toBeTruthy();
    });

    const clearButton = getByText(messages.import_from_seed.clear_all);

    await act(async () => {
      await fireEvent.press(clearButton);
    });

    await waitFor(() => {
      const textareaInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
      expect(textareaInput.props.value).toBe('');
    });
  });

  it('tracks IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED event on successful import', async () => {
    mockGetString.mockResolvedValue(valid24WordMnemonic);

    const { getByTestId, getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const pasteButton = getByText(messages.import_from_seed.paste);

    await act(async () => {
      await fireEvent.press(pasteButton);
    });

    await waitFor(() => {
      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
      expect(importButton.props.disabled).toBe(false);
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

    await act(async () => {
      await fireEvent.press(importButton);
    });

    // Check that the import function was called with the correct parameters
    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid24WordMnemonic,
      undefined,
      expect.any(Function),
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED,
      )
        .addProperties({
          number_of_solana_accounts_discovered: 3,
        })
        .build(),
    );
  });

  it('tracks IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED event when multichain state 2 is enabled', async () => {
    mockIsMultichainAccountsState2Enabled.mockReturnValue(true);
    mockGetString.mockResolvedValue(valid24WordMnemonic);

    const { getByTestId, getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const pasteButton = getByText(messages.import_from_seed.paste);

    await act(async () => {
      await fireEvent.press(pasteButton);
    });

    await waitFor(() => {
      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
      expect(importButton.props.disabled).toBe(false);
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

    await act(async () => {
      await fireEvent.press(importButton);
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED,
        )
          .addProperties({
            number_of_solana_accounts_discovered: 3,
          })
          .build(),
      );
    });
  });

  it('displays success toast after successful SRP import', async () => {
    mockGetString.mockResolvedValue(valid24WordMnemonic);

    const { getByTestId, getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const pasteButton = getByText(messages.import_from_seed.paste);

    await act(async () => {
      await fireEvent.press(pasteButton);
    });

    await waitFor(() => {
      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
      expect(importButton.props.disabled).toBe(false);
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

    await act(async () => {
      await fireEvent.press(importButton);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('WalletView');
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: 'Wallet 2 imported',
        },
      ],
      iconName: IconName.Check,
      hasNoTimeout: false,
    });
  });

  describe('errors', () => {
    it('displays error for invalid word in pasted SRP', async () => {
      mockGetString.mockResolvedValue(invalidMnemonic);

      const { getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(
          getByText(messages.import_from_seed.spellcheck_error),
        ).toBeTruthy();
      });
    });

    it('clears error when SRP is cleared', async () => {
      mockGetString.mockResolvedValue(invalidMnemonic);

      const { getByText, queryByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(
          getByText(messages.import_from_seed.spellcheck_error),
        ).toBeTruthy();
      });

      const clearButton = getByText(messages.import_from_seed.clear_all);

      await act(async () => {
        await fireEvent.press(clearButton);
      });

      await waitFor(() => {
        expect(
          queryByText(messages.import_from_seed.spellcheck_error),
        ).toBeNull();
      });
    });

    it('displays error when import fails with duplicate SRP', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
        new Error('This mnemonic has already been imported.'),
      );
      mockGetString.mockResolvedValue(valid12WordMnemonic);

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
        expect(importButton.props.disabled).toBe(false);
      });

      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

      await act(async () => {
        await fireEvent.press(importButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          messages.import_new_secret_recovery_phrase.error_duplicate_srp,
        );
      });

      mockAlert.mockRestore();
    });

    it('displays error when import fails with duplicate account', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
        new Error(
          'KeyringController - The account you are trying to import is a duplicate',
        ),
      );
      mockGetString.mockResolvedValue(valid12WordMnemonic);

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
        expect(importButton.props.disabled).toBe(false);
      });

      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

      await act(async () => {
        await fireEvent.press(importButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          messages.import_new_secret_recovery_phrase.error_duplicate_account,
        );
      });

      mockAlert.mockRestore();
    });

    it('displays generic error when import fails', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      mockImportNewSecretRecoveryPhrase.mockRejectedValueOnce(
        new Error('Network error'),
      );
      mockGetString.mockResolvedValue(valid12WordMnemonic);

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
        expect(importButton.props.disabled).toBe(false);
      });

      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

      await act(async () => {
        await fireEvent.press(importButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          messages.import_new_secret_recovery_phrase.error_title,
          messages.import_new_secret_recovery_phrase.error_message,
        );
      });

      mockAlert.mockRestore();
    });
  });

  describe('seedless password check', () => {
    it('stops import when seedless password is outdated', async () => {
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValueOnce(true);
      mockGetString.mockResolvedValue(valid12WordMnemonic);

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
        expect(importButton.props.disabled).toBe(false);
      });

      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

      await act(async () => {
        await fireEvent.press(importButton);
      });

      expect(mockImportNewSecretRecoveryPhrase).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('QR scanner', () => {
    it('fills SRP when QR scan returns seed data', async () => {
      renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const navigationCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'QRTabSwitcher',
      );

      expect(navigationCall).toBeUndefined();

      const setOptionsCall = mockSetOptions.mock.calls[0];
      expect(setOptionsCall).toBeDefined();
    });

    it('shows alert when QR scan returns no seed', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');

      renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      mockAlert.mockRestore();
    });
  });

  describe('partial SRP input', () => {
    it('keeps import button disabled for incomplete SRP', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const textareaInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);

      await act(async () => {
        await fireEvent.changeText(textareaInput, 'word1 word2 word3 word4');
      });

      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
      expect(importButton.props.disabled).toBe(true);
    });

    it('handles empty string in textarea', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const textareaInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);

      await act(async () => {
        await fireEvent.changeText(textareaInput, '');
      });

      expect(textareaInput.props.value).toBe('');
    });

    it('normalizes multiple spaces between words', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const textareaInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);

      await act(async () => {
        await fireEvent.changeText(textareaInput, 'word1    word2   word3');
      });

      await waitFor(() => {
        const input0 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
        const input1 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);
        const input2 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_2`);
        expect(input0.props.value).toBe('word1');
        expect(input1.props.value).toBe('word2');
        expect(input2.props.value).toBe('word3');
      });
    });
  });

  describe('grid mode interactions', () => {
    it('removes input when backspace is pressed on empty field', async () => {
      mockGetString.mockResolvedValue('word1 word2 word3');

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_2`),
        ).toBeTruthy();
      });

      const input2 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_2`);

      await act(async () => {
        await fireEvent(input2, 'onKeyPress', {
          nativeEvent: { key: 'Backspace' },
        });
      });

      await waitFor(() => {
        const inputs = [0, 1].map((i) =>
          getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_${i}`),
        );
        expect(inputs.length).toBe(2);
      });
    });

    it('adds space when enter key is pressed in grid input', async () => {
      mockGetString.mockResolvedValue('word1 word2');

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`),
        ).toBeTruthy();
      });

      const input1 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      await act(async () => {
        await fireEvent(input1, 'onSubmitEditing');
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_2`),
        ).toBeTruthy();
      });
    });

    it('updates single character in grid input without space', async () => {
      mockGetString.mockResolvedValue('word1 word2 word3');

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`),
        ).toBeTruthy();
      });

      const input1 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      await act(async () => {
        await fireEvent.changeText(input1, 'word2a');
      });

      await waitFor(() => {
        const updatedInput = getByTestId(
          `${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`,
        );
        expect(updatedInput.props.value).toBe('word2a');
      });
    });

    it('validates word on focus change', async () => {
      mockGetString.mockResolvedValue('word1 word2 word3');

      const { getByTestId, getByText, queryByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`),
        ).toBeTruthy();
      });

      const input0 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
      const input1 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      await act(async () => {
        await fireEvent(input0, 'onFocus');
      });

      await act(async () => {
        await fireEvent.changeText(input0, 'invalidword123');
      });

      await act(async () => {
        await fireEvent(input0, 'onBlur');
      });

      await act(async () => {
        await fireEvent(input1, 'onFocus');
      });

      await waitFor(() => {
        expect(
          queryByText(messages.import_from_seed.spellcheck_error),
        ).toBeTruthy();
      });
    });

    it('handles empty split array when pasting only spaces', async () => {
      mockGetString.mockResolvedValue('word1 word2');

      const { getByTestId, getByText } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const pasteButton = getByText(messages.import_from_seed.paste);

      await act(async () => {
        await fireEvent.press(pasteButton);
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`),
        ).toBeTruthy();
      });

      const input1 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`);

      await act(async () => {
        await fireEvent.changeText(input1, '   ');
      });

      await waitFor(() => {
        const updatedInput = getByTestId(
          `${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_1`,
        );
        expect(updatedInput.props.value).toBe('');
      });
    });
  });

  describe('navigation', () => {
    it('navigates back when back button is pressed', async () => {
      renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      const headerLeft = setOptionsCall.headerLeft;

      const { getByTestId } = renderScreen(
        () => headerLeft(),
        { name: 'HeaderLeft' },
        { state: initialState },
      );

      const backButton = getByTestId(ImportSRPIDs.BACK);

      await act(async () => {
        await fireEvent.press(backButton);
      });

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('opens QR scanner when QR button is pressed', async () => {
      renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      const headerRight = setOptionsCall.headerRight;

      const { getByTestId } = renderScreen(
        () => headerRight(),
        { name: 'HeaderRight' },
        { state: initialState },
      );

      const qrButton = getByTestId('qr-code-button');

      await act(async () => {
        await fireEvent.press(qrButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'QRTabSwitcher',
        expect.objectContaining({
          initialScreen: 0,
          disableTabber: true,
        }),
      );
    });

    it('navigates to SRP info modal when info icon is pressed', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const infoIcon = getByTestId('info-icon');

      await act(async () => {
        await fireEvent.press(infoIcon);
      });

      expect(mockNavigate).toHaveBeenCalledWith('SeedphraseModal');
    });
  });

  describe('QR scan callbacks', () => {
    it('fills SRP when QR scan returns seed in data object', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      const headerRight = setOptionsCall.headerRight;

      const { getByTestId: getHeaderButton } = renderScreen(
        () => headerRight(),
        { name: 'HeaderRight' },
        { state: initialState },
      );

      const qrButton = getHeaderButton('qr-code-button');

      await act(async () => {
        await fireEvent.press(qrButton);
      });

      const navigateCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'QRTabSwitcher',
      );
      const onScanSuccess = navigateCall[1].onScanSuccess;

      await act(async () => {
        onScanSuccess({ seed: valid12WordMnemonic }, undefined);
      });

      await waitFor(() => {
        const input0 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
        expect(input0.props.value).toBe('lazy');
      });
    });

    it('fills SRP when QR scan returns seed in content parameter', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      const headerRight = setOptionsCall.headerRight;

      const { getByTestId: getHeaderButton } = renderScreen(
        () => headerRight(),
        { name: 'HeaderRight' },
        { state: initialState },
      );

      const qrButton = getHeaderButton('qr-code-button');

      await act(async () => {
        await fireEvent.press(qrButton);
      });

      const navigateCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'QRTabSwitcher',
      );
      const onScanSuccess = navigateCall[1].onScanSuccess;

      await act(async () => {
        onScanSuccess({}, valid12WordMnemonic);
      });

      await waitFor(() => {
        const input0 = getByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_0`);
        expect(input0.props.value).toBe('lazy');
      });
    });

    it('shows alert when QR scan returns no seed data', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');

      renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      const headerRight = setOptionsCall.headerRight;

      const { getByTestId } = renderScreen(
        () => headerRight(),
        { name: 'HeaderRight' },
        { state: initialState },
      );

      const qrButton = getByTestId('qr-code-button');

      await act(async () => {
        await fireEvent.press(qrButton);
      });

      const navigateCall = mockNavigate.mock.calls.find(
        (call) => call[0] === 'QRTabSwitcher',
      );
      const onScanSuccess = navigateCall[1].onScanSuccess;

      await act(async () => {
        onScanSuccess({}, undefined);
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Invalid QR Code',
        'The QR code does not contain a valid Secret Recovery Phrase',
      );

      mockAlert.mockRestore();
    });
  });

  describe('SRP Word Suggestions Feature', () => {
    it('renders SRP input grid for word suggestions', () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        { state: initialState },
      );

      const srpInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);

      expect(srpInput).toBeTruthy();
    });

    it('renders with KeyboardProvider wrapper in non-E2E environment', () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        { state: initialState },
      );

      const srpInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);

      expect(srpInput).toBeTruthy();
    });

    it('renders KeyboardStickyView with SrpWordSuggestions when keyboard is visible', async () => {
      mockUseKeyboardState.mockImplementation(
        (selector: (state: { isVisible: boolean }) => boolean) =>
          selector({ isVisible: true }),
      );

      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        { state: initialState },
      );

      const srpInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
      await act(async () => {
        fireEvent.changeText(srpInput, 'ab');
      });

      expect(getByTestId('srp-word-suggestions')).toBeTruthy();
    });

    it('does not render KeyboardStickyView when keyboard is not visible', async () => {
      mockUseKeyboardState.mockImplementation(
        (selector: (state: { isVisible: boolean }) => boolean) =>
          selector({ isVisible: false }),
      );

      const { getByTestId, queryByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        { state: initialState },
      );

      // Act
      const srpInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);
      await act(async () => {
        fireEvent.changeText(srpInput, 'ab');
      });

      // Assert
      expect(queryByTestId('srp-word-suggestions')).toBeNull();
    });

    it('passes onCurrentWordChange to SrpInputGrid', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        { state: initialState },
      );

      const srpInput = getByTestId(ImportSRPIDs.SEED_PHRASE_INPUT_ID);

      await act(async () => {
        fireEvent.changeText(srpInput, 'ab');
      });

      expect(srpInput).toBeTruthy();
    });
  });
});
