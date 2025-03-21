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

const renderSRPImportComponentAndPasteSRP = async (srp: string) => {
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

  it('imports valid manually entered 12-word SRP', async () => {
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

    await fireEvent.press(importButton);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid12WordMnemonic,
    );
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  it('imports valid manually entered 24-word SRP', async () => {
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

    await fireEvent.press(importButton);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid24WordMnemonic,
    );
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  it('imports valid pasted 12-word SRP', async () => {
    const { getByTestId } = await renderSRPImportComponentAndPasteSRP(
      valid24WordMnemonic,
    );

    await act(() => {
      for (const [index, word] of valid24WordMnemonic.split(' ').entries()) {
        const value = getByTestId(
          `${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-${index + 1}`,
        );

        expect(value.props.value).toBe(word);
      }
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    await fireEvent.press(importButton);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid24WordMnemonic,
    );
  });

  it('imports valid pasted 24-word SRP', async () => {
    const { getByTestId } = await renderSRPImportComponentAndPasteSRP(
      valid24WordMnemonic,
    );

    await act(() => {
      for (const [index, word] of valid24WordMnemonic.split(' ').entries()) {
        const value = getByTestId(
          `${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-${index + 1}`,
        );

        expect(value.props.value).toBe(word);
      }
    });

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    await fireEvent.press(importButton);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid24WordMnemonic,
    );
  });
  it('imports valid SRP', async () => {
    const { getByTestId } = await renderSRPImportComponentAndPasteSRP(
      valid24WordMnemonic,
    );

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    await fireEvent.press(importButton);

    expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
      valid24WordMnemonic,
    );
    expect(mockNavigate).toHaveBeenCalledWith('WalletView');
  });

  describe('errors', () => {
    it('displays error for invalid SRP', async () => {
      const { getByText } = await renderSRPImportComponentAndPasteSRP(
        'invalid mnemonic',
      );

      expect(
        getByText(
          messages.import_new_secret_recovery_phrase
            .error_number_of_words_error_message,
        ),
      ).toBeTruthy();
    });

    it('displays single incorrect word', async () => {
      const { getByText } = await renderSRPImportComponentAndPasteSRP(
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

    it('displays multiple incorrect words', async () => {
      const { getByText } = await renderSRPImportComponentAndPasteSRP(
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
      const { getByText, getByTestId } =
        await renderSRPImportComponentAndPasteSRP(valid24WordMnemonic);

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
