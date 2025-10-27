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

// Enable fake timers
jest.useFakeTimers();

describe('ImportNewSecretRecoveryPhrase', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  beforeEach(() => {
    jest.clearAllTimers();
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
  });

  it('renders initial textarea input', () => {
    const { getByTestId } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const textareaInput = getByTestId(ImportSRPIDs.PASTE_BUTTON);
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
      jest.runAllTimers();
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
      jest.runAllTimers();
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

    const textareaInput = getByTestId(ImportSRPIDs.PASTE_BUTTON);

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
      jest.runAllTimers();
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
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(getByText(messages.import_from_seed.clear_all)).toBeTruthy();
    });

    const clearButton = getByText(messages.import_from_seed.clear_all);

    await act(async () => {
      await fireEvent.press(clearButton);
    });

    await waitFor(() => {
      const textareaInput = getByTestId(ImportSRPIDs.PASTE_BUTTON);
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
      jest.runAllTimers();
    });

    await waitFor(() => {
      const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
      expect(importButton.props.disabled).toBe(false);
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);

    await act(async () => {
      await fireEvent.press(importButton);
    });

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
      jest.runAllTimers();
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
      jest.runAllTimers();
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
});
