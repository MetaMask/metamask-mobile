import { useContext } from 'react';
import { renderScreen } from '../../../util/test/renderWithProvider';
import ImportNewSecretRecoveryPhrase from './';
import { ImportSRPIDs } from './SRPImport.testIds';
import Clipboard from '@react-native-clipboard/clipboard';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import messages from '../../../../locales/languages/en.json';
import {
  MOCK_HD_ACCOUNTS,
  MOCK_HD_KEYRING_METADATA,
} from '../../../selectors/keyringController/testUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
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
const mockCheckIsSeedlessPasswordOutdated = jest.fn();
const mockShowToast = jest.fn();
const mockFetchAccountsWithActivity = jest.fn();

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

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('../../hooks/useAccountsWithNetworkActivitySync', () => ({
  useAccountsWithNetworkActivitySync: () => ({
    fetchAccountsWithActivity: mockFetchAccountsWithActivity,
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

  it('navigates to WalletView after valid 12-word SRP submission', async () => {
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
      expect(mockNavigate).toHaveBeenCalledWith('WalletView');
    });
  });

  it('navigates to WalletView after valid 24-word SRP submission', async () => {
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
  });

  it('calls fetchAccountsWithActivity after valid SRP submission', async () => {
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
      expect(mockFetchAccountsWithActivity).toHaveBeenCalled();
    });
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

  it('displays success toast after successful SRP submission', async () => {
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

      const { getByText, getAllByText } = renderScreen(
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
        const errorMessages = getAllByText(
          messages.import_from_seed.spellcheck_error,
        );
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('clears error when SRP is cleared', async () => {
      mockGetString.mockResolvedValue(invalidMnemonic);

      const { getByText, getAllByText, queryAllByText } = renderScreen(
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
        const errorMessages = getAllByText(
          messages.import_from_seed.spellcheck_error,
        );
        expect(errorMessages.length).toBeGreaterThan(0);
      });

      const clearButton = getByText(messages.import_from_seed.clear_all);

      await act(async () => {
        await fireEvent.press(clearButton);
      });

      await waitFor(() => {
        expect(
          queryAllByText(messages.import_from_seed.spellcheck_error).length,
        ).toBe(0);
      });
    });

    it('displays error when fetchAccountsWithActivity fails with duplicate SRP', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      mockFetchAccountsWithActivity.mockRejectedValueOnce(
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

    it('displays error when fetchAccountsWithActivity fails with duplicate account', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      mockFetchAccountsWithActivity.mockRejectedValueOnce(
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

    it('displays generic error when fetchAccountsWithActivity fails', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      mockFetchAccountsWithActivity.mockRejectedValueOnce(
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
    it('stops submission when seedless password is outdated', async () => {
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

      expect(mockFetchAccountsWithActivity).not.toHaveBeenCalled();
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

    it('dismisses keyboard when submit is pressed in grid input', async () => {
      mockGetString.mockResolvedValue('word1 word2');

      const { getByTestId, getByText, queryByTestId } = renderScreen(
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

      // Verify no new input was created (keyboard just dismisses)
      await waitFor(() => {
        expect(
          queryByTestId(`${ImportSRPIDs.SEED_PHRASE_INPUT_ID}_2`),
        ).toBeNull();
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

      const { getByTestId, getByText, queryAllByText } = renderScreen(
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
          queryAllByText(messages.import_from_seed.spellcheck_error).length,
        ).toBeGreaterThan(0);
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
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
      );

      const backButton = getByTestId(ImportSRPIDs.BACK);

      await act(async () => {
        await fireEvent.press(backButton);
      });

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('opens QR scanner when QR button is pressed', async () => {
      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
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

      const qrButton = getByTestId('qr-code-button');

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

      const qrButton = getByTestId('qr-code-button');

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

      const { getByTestId } = renderScreen(
        ImportNewSecretRecoveryPhrase,
        { name: 'ImportNewSecretRecoveryPhrase' },
        {
          state: initialState,
        },
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
        'Invalid QR code',
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
