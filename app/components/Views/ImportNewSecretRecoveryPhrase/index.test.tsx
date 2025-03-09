import { renderScreen } from '../../../util/test/renderWithProvider';
import ImportNewSecretRecoveryPhrase from './';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import ClipboardManager from '../../../core/ClipboardManager';
import { act, fireEvent } from '@testing-library/react-native';
import messages from '../../../../locales/languages/en.json';
import {
  MOCK_HD_ACCOUNTS,
  MOCK_HD_KEYRING_METADATA,
} from '../../../selectors/keyringController/testUtils';
import { KeyringTypes } from '@metamask/keyring-controller';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockImportNewSecretRecoveryPhrase = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../actions/multiSrp', () => ({
  ...jest.requireActual('../../../actions/multiSrp'),
  importNewSecretRecoveryPhrase: (srp: string) =>
    mockImportNewSecretRecoveryPhrase(srp),
}));

jest.mock('../../../core/ClipboardManager', () => ({
  getString: jest.fn(),
}));

const valid12WordMnemonic =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

const valid24WordMnemonic =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

const mockPaste = jest
  .spyOn(ClipboardManager, 'getString')
  .mockResolvedValue(valid24WordMnemonic);

const initialState = {
  engine: {
    backgroundState: {
      KeyringController: {
        keyrings: [{ type: KeyringTypes.hd, accounts: MOCK_HD_ACCOUNTS }],
        keyringsMetadata: [MOCK_HD_KEYRING_METADATA],
      },
    },
  },
};

const renderAndPasteSRP = async (srp = valid24WordMnemonic) => {
  mockPaste.mockResolvedValue(srp);

  const render = renderScreen(
    ImportNewSecretRecoveryPhrase,
    { name: 'ImportNewSecretRecoveryPhrase' },
    {
      state: initialState,
    },
  );
  const { getByTestId } = render;

  const pasteButton = getByTestId(ImportSRPIDs.PASTE_BUTTON);
  await fireEvent.press(pasteButton);

  return render;
};

describe('ImportNewSecretRecoveryPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles valid 12 word srps being input manually', async () => {
    const { getByTestId } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    for (const [index, word] of valid12WordMnemonic.split(' ').entries()) {
      const value = getByTestId(
        `${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-${index + 1}`,
      );

      await fireEvent.changeText(value, word);
    }

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    expect(importButton.props.disabled).toBe(false);
  });

  it('handles valid 24 word srps being input manually', async () => {
    const { getByTestId, getByText } = renderScreen(
      ImportNewSecretRecoveryPhrase,
      { name: 'ImportNewSecretRecoveryPhrase' },
      {
        state: initialState,
      },
    );

    const dropdown = getByTestId(ImportSRPIDs.SRP_SELECTION_DROPDOWN);
    await fireEvent.press(dropdown);

    const optionToSelect = getByText(
      messages.import_new_secret_recovery_phrase['24_word_option'],
    );
    await fireEvent.press(optionToSelect);

    for (const [index, word] of valid24WordMnemonic.split(' ').entries()) {
      const value = getByTestId(
        `${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-${index + 1}`,
      );

      await fireEvent.changeText(value, word);
    }

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    expect(importButton.props.disabled).toBe(false);
  });

  it('handles pasting of 12 word srp', async () => {
    const { getByTestId } = await renderAndPasteSRP();

    await act(() => {
      for (const [index, word] of valid24WordMnemonic.split(' ').entries()) {
        const value = getByTestId(
          `${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-${index + 1}`,
        );

        expect(value.props.value).toBe(word);
      }
    });
  });

  it('handles pasting of 24 word srp', async () => {
    const { getByTestId } = await renderAndPasteSRP();

    await act(() => {
      for (const [index, word] of valid24WordMnemonic.split(' ').entries()) {
        const value = getByTestId(
          `${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-${index + 1}`,
        );

        expect(value.props.value).toBe(word);
      }
    });
  });

  it('should handle successful import', async () => {
    const { getByTestId } = await renderAndPasteSRP();

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    await fireEvent.press(importButton);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid24WordMnemonic,
    );
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  describe('errors', () => {
    it('should display error when the user inputs an invalid srp', async () => {
      const { getByText } = await renderAndPasteSRP('invalid mnemonic');

      expect(
        getByText(
          messages.import_new_secret_recovery_phrase
            .error_number_of_words_error_message,
        ),
      ).toBeTruthy();
    });

    it('should display which word is incorrect', async () => {
      const { getByText } = await renderAndPasteSRP(
        valid24WordMnemonic.replace('verb', 'asdf'), // replace the first word
      );

      expect(
        getByText(
          `${
            messages.import_new_secret_recovery_phrase.error_srp_word_error_1
          }${1}${
            messages.import_new_secret_recovery_phrase.error_srp_word_error_2
          }`,
        ),
      ).toBeTruthy();
    });

    it('display which words are incorrect', async () => {
      const { getByText } = await renderAndPasteSRP(
        valid24WordMnemonic.replace('verb', 'asdf').replace('middle', 'sdfsdf'), // replace the first two word
      );

      expect(
        getByText(
          `${
            messages.import_new_secret_recovery_phrase
              .error_multiple_srp_word_error_1
          }${1}${
            messages.import_new_secret_recovery_phrase
              .error_multiple_srp_word_error_2
          }${2}${
            messages.import_new_secret_recovery_phrase
              .error_multiple_srp_word_error_3
          }`,
        ),
      ).toBeTruthy();
    });

    it('displays case sensitive error', async () => {
      const { getByText, getByTestId } = await renderAndPasteSRP(
        valid24WordMnemonic,
      );

      const firstWord = getByTestId(`${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-1`);
      fireEvent.changeText(firstWord, 'Verb');

      expect(
        getByText(
          messages.import_new_secret_recovery_phrase
            .error_srp_is_case_sensitive,
        ),
      ).toBeTruthy();
    });
  });
});
