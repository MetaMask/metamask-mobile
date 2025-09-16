import { renderScreen } from '../../../util/test/renderWithProvider';
import ImportNewSecretRecoveryPhrase from './';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import ClipboardManager from '../../../core/ClipboardManager';
import { act, fireEvent, userEvent } from '@testing-library/react-native';
import messages from '../../../../locales/languages/en.json';
import {
  MOCK_HD_ACCOUNTS,
  MOCK_HD_KEYRING_METADATA,
} from '../../../selectors/keyringController/testUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import useMetrics from '../../hooks/useMetrics/useMetrics';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockImportNewSecretRecoveryPhrase = jest.fn();
const mockTrackEvent = jest.fn();
const mockCheckIsSeedlessPasswordOutdated = jest.fn();

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

jest.mock('../../../core', () => ({
  ...jest.requireActual('../../../core'),
  Authentication: {
    checkIsSeedlessPasswordOutdated: () =>
      mockCheckIsSeedlessPasswordOutdated(),
  },
}));

jest.mock('../../../core/ClipboardManager', () => ({
  getString: jest.fn(),
}));

jest.mock('../../hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const valid12WordMnemonic =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

const valid24WordMnemonic =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

const invalidMnemonic =
  'aaaaa youth dentist air relief leave neither liquid belt aspect bone frame';

const mockPaste = jest
  .spyOn(ClipboardManager, 'getString')
  .mockResolvedValue(valid24WordMnemonic);

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
  await userEvent.press(pasteButton);

  return render;
};

describe('ImportNewSecretRecoveryPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: '9fE6zKgca6K2EEa3yjbcq7zGMusUNqSQeWQNL2YDZ2Yi',
      discoveredAccountsCount: 3,
    });

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    });

    mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);
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

  it('tracks IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED event on successful import', async () => {
    const { getByTestId } = await renderSRPImportComponentAndPasteSRP(
      valid24WordMnemonic,
    );

    const importButton = getByTestId(ImportSRPIDs.IMPORT_BUTTON);
    await fireEvent.press(importButton);

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

  describe('errors', () => {
    it('displays single incorrect word', async () => {
      const { getByText } = await renderSRPImportComponentAndPasteSRP(
        invalidMnemonic,
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

    it('does not display error if SRP is empty', async () => {
      const { getByTestId, queryByTestId } =
        await renderSRPImportComponentAndPasteSRP(invalidMnemonic);

      const error = queryByTestId(ImportSRPIDs.SRP_ERROR);

      expect(error).toBeTruthy();

      const clearButton = getByTestId(ImportSRPIDs.PASTE_BUTTON);
      await fireEvent.press(clearButton);

      const updatedError = queryByTestId(ImportSRPIDs.SRP_ERROR);

      expect(updatedError).toBeNull();
    });

    it('does not display error if SRP is cleared manually', async () => {
      const { getByTestId, queryByTestId } =
        await renderSRPImportComponentAndPasteSRP(invalidMnemonic);

      const error = queryByTestId(ImportSRPIDs.SRP_ERROR);

      expect(error).toBeTruthy();

      const firstWord = getByTestId(`${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-1`);
      fireEvent.changeText(firstWord, 'lazy');

      const updatedError = queryByTestId(ImportSRPIDs.SRP_ERROR);

      expect(updatedError).toBeNull();
    });

    it('displays errors only if all the words are entered', async () => {
      const { getByTestId, queryByTestId } =
        await renderSRPImportComponentAndPasteSRP('');

      let error = queryByTestId(ImportSRPIDs.SRP_ERROR);

      expect(error).toBeNull();

      mockPaste.mockResolvedValue(invalidMnemonic);
      const pasteButton = getByTestId(ImportSRPIDs.PASTE_BUTTON);
      await userEvent.press(pasteButton);

      error = queryByTestId(ImportSRPIDs.SRP_ERROR);

      expect(error).toBeTruthy();
    });
  });
});
