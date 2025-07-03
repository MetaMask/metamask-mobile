import { renderScreen } from '../../../util/test/renderWithProvider';
import ImportFromSecretRecoveryPhrase from '.';
import Routes from '../../../constants/navigation/Routes';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { ImportFromSeedSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import { strings } from '../../../../locales/i18n';
import { Authentication } from '../../../core';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
import Clipboard from '@react-native-clipboard/clipboard';
import { MIN_PASSWORD_LENGTH } from '../../../util/password';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { InteractionManager } from 'react-native';

// Mock the clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn().mockResolvedValue(''),
}));

const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
};

const mockIsEnabled = jest.fn().mockReturnValue(true);

jest.mock('../../hooks/useMetrics', () => {
  const actualUseMetrics = jest.requireActual('../../hooks/useMetrics');
  return {
    ...actualUseMetrics,
    useMetrics: jest.fn().mockReturnValue({
      ...actualUseMetrics.useMetrics,
      isEnabled: () => mockIsEnabled(),
    }),
  };
});

describe('ImportFromSecretRecoveryPhrase', () => {
  jest
    .spyOn(InteractionManager, 'runAfterInteractions')
    .mockImplementation((cb) => {
      if (cb && typeof cb === 'function') {
        cb();
      }
      return {
        then: jest.fn(),
        done: jest.fn(),
        cancel: jest.fn(),
      };
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Import a wallet UI', () => {
    it('render matches snapshot', () => {
      const { toJSON } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('has current step as 1 on initial render when currentStep is 0', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // The component shows steps as "Step 1 of 2" when currentStep is 0
      expect(
        getByText(
          strings('import_from_seed.steps', {
            currentStep: 1,
            totalSteps: 2,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('renders Import wallet title and description', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      expect(getByText(strings('import_from_seed.title'))).toBeOnTheScreen();
      expect(
        getByText(
          strings('import_from_seed.enter_your_secret_recovery_phrase'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders continue button disabled initially', () => {
      const { getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const continueButton = getByRole('button', { name: 'Continue' });
      expect(continueButton.props.disabled).toBe(true);
    });

    it('renders paste button when no seed phrase is entered', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      jest.mocked(Clipboard.getString).mockResolvedValue('test');
      const pasteButton = getByText(strings('import_from_seed.paste'));
      expect(pasteButton).toBeOnTheScreen();
      fireEvent.press(pasteButton);
      jest.mocked(Clipboard.getString).mockResolvedValue('');
    });

    it('renders show all and Paste button when no seed phrase is entered', async () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const showAllButton = getByText(strings('import_from_seed.show_all'));
      expect(showAllButton).toBeOnTheScreen();

      const pasteButton = getByText(strings('import_from_seed.paste'));
      expect(pasteButton).toBeOnTheScreen();
    });

    it('enter 12 length seed phrase and check the input fields are rendered', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(
          input,
          'say devote wasp video cool lunch brief add fever uncover novel offer',
        );
      });

      const getInput = (index: number) =>
        getByTestId(
          `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
        );

      for (let i = 0; i < 12; i++) {
        expect(getInput(i)).toBeOnTheScreen();
      }

      expect(getInput(0).props.value).toBe('say');
      expect(getInput(1).props.value).toBe('devote');
      expect(getInput(2).props.value).toBe('wasp');
      expect(getInput(3).props.value).toBe('video');
      expect(getInput(4).props.value).toBe('cool');
      expect(getInput(5).props.value).toBe('lunch');
      expect(getInput(6).props.value).toBe('brief');
      expect(getInput(7).props.value).toBe('add');
      expect(getInput(8).props.value).toBe('fever');
      expect(getInput(9).props.value).toBe('uncover');
      expect(getInput(10).props.value).toBe('novel');
      expect(getInput(11).props.value).toBe('offer');
    });

    it('renders clear all button when seed phrase is entered on click clear the input fields and paste button is rendered', async () => {
      const { getByText, getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      expect(input).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(
          input,
          'test test test test test test test test test test test test',
        );
      });

      const clearAllButton = getByText(strings('import_from_seed.clear_all'));
      expect(clearAllButton).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(clearAllButton);
      });

      const pasteButton = getByText(strings('import_from_seed.paste'));
      expect(pasteButton).toBeOnTheScreen();
    });

    it('on valid seed phrase entered, continue button is enabled', async () => {
      const { getByPlaceholderText, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter a valid 12-word seed phrase
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      fireEvent.changeText(
        input,
        'say devote wasp video cool lunch brief add fever uncover novel offer',
      );

      const continueButton = getByRole('button', { name: 'Continue' });
      // Wait for continue button to be enabled
      await waitFor(
        () => {
          expect(continueButton.props.disabled).toBe(false);
        },
        { timeout: 3000 },
      );
    });

    it('renders qr code button', async () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const qrCodeButton = getByTestId(
        ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID,
      );
      expect(qrCodeButton).toBeOnTheScreen();
    });

    it('on valid seed phrase clicking continue button, it navigates to step 2 i.e. Create password', async () => {
      const { getByText, getByPlaceholderText, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter a valid 12-word seed phrase
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      fireEvent.changeText(
        input,
        'say devote wasp video cool lunch brief add fever uncover novel offer',
      );

      const continueButton = getByRole('button', { name: 'Continue' });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      // Wait for step 2 to appear and verify
      await waitFor(
        () => {
          expect(
            getByText(
              strings('import_from_seed.steps', {
                currentStep: 2,
                totalSteps: 2,
              }),
            ),
          ).toBeOnTheScreen();
          expect(
            getByText(strings('import_from_seed.metamask_password')),
          ).toBeOnTheScreen();
        },
        { timeout: 3000 },
      );
    });

    it('on backspace key press, the input field value is updated', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(input, 'test word ');
      });

      await act(async () => {
        fireEvent(input, 'keyPress', {
          nativeEvent: { key: 'Backspace' },
          index: 1,
        });
      });

      const secondInput = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`,
      );

      await waitFor(() => {
        expect(secondInput).toBeOnTheScreen();
        expect(secondInput.props.value).toBe('word');
      });
    });

    it('on entering a valid seed phrase, continue button is enabled', async () => {
      const { getByPlaceholderText, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      // Enter multiple words
      await act(async () => {
        fireEvent.changeText(
          input,
          'frame midnight talk absent spy release check below volume industry advance neglect',
        );
      });

      // Verify continue button is still disabled (since it's not a complete seed phrase)
      const continueButton = getByRole('button', { name: 'Continue' });
      expect(continueButton.props.disabled).toBe(false);
    });

    it('on backspace key press, the input field length is updated', async () => {
      const { getByTestId, getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      // Enter multiple words
      await act(async () => {
        fireEvent.changeText(input, 'word1 word2 word3');
      });

      // Get all input fields after they are created
      const inputFields = await waitFor(() => {
        const fields = [];
        for (let i = 0; i < 3; i++) {
          const field = getByTestId(
            `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${i}`,
          );
          fields.push(field);
        }
        return fields;
      });

      // Verify initial state
      expect(inputFields[0].props.value).toBe('word1');
      expect(inputFields[1].props.value).toBe('word2');
      expect(inputFields[2].props.value).toBe('word3');

      // Simulate backspace press on the third input field
      fireEvent(inputFields[2], 'keyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // Wait for the component to update and verify the input values
      await waitFor(() => {
        const updatedFields = [];
        for (let i = 0; i < 2; i++) {
          const field = getByTestId(
            `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${i}`,
          );
          updatedFields.push(field);
        }
        expect(updatedFields[0].props.value).toBe('word1');
        expect(updatedFields[1].props.value).toBe('word2');
      });

      // Simulate backspace press on the second input field
      fireEvent(inputFields[1], 'keyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // Wait for the component to update and verify the final input value
      await waitFor(() => {
        const finalField = getByTestId(
          `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
        );
        expect(finalField.props.value).toBe('word1');
      });
    });

    it('on entering an invalid seed phrase, spellcheck error message is shown', async () => {
      const { getByPlaceholderText, getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Test case 1: Invalid length (less than 12 words)
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      // Invalid mnemonic
      const invalidMnemonic = 'invalid '.repeat(12).trim();

      // Enter invalid mnemonic
      await act(async () => {
        fireEvent.changeText(input, invalidMnemonic);
      });

      await waitFor(() => {
        const errorMessage = getByText(
          strings('import_from_seed.spellcheck_error'),
        );
        expect(errorMessage).toBeOnTheScreen();
      });
    });

    it('on entering a valid seed phrase, continue button is enabled and it navigates to create password UI', async () => {
      const { getByText, getByPlaceholderText, getByRole, getByTestId } =
        renderScreen(
          ImportFromSecretRecoveryPhrase,
          { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
          { state: initialState },
        );

      // Test case 1: Invalid length (less than 12 words)
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      const continueButton = getByRole('button', { name: 'Continue' });

      // Valid 12-word mnemonic
      const validMnemonic =
        'say devote wasp video cool lunch brief add fever uncover novel offer';

      // Enter valid mnemonic
      await act(async () => {
        fireEvent.changeText(input, validMnemonic);
      });

      // Get all input fields after they are created
      const inputFields = await waitFor(() => {
        const fields = [];
        for (let i = 0; i < 12; i++) {
          const field = getByTestId(
            `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${i}`,
          );
          fields.push(field);
        }
        return fields;
      });

      // Verify initial state
      expect(inputFields[0].props.value).toBe('say');

      // Press continue and verify step 2
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(
          getByText(
            strings('import_from_seed.steps', {
              currentStep: 2,
              totalSteps: 2,
            }),
          ),
        ).toBeOnTheScreen();
        expect(
          getByText(strings('import_from_seed.metamask_password')),
        ).toBeOnTheScreen();
      });
    });

    it('on entering a new word, the next input field is rendered', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter invalid seed phrase
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(input, 'horse one');
      });

      const getInput = (index: number) =>
        getByTestId(
          `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
        );

      const input0 = getInput(0);
      const input1 = getInput(1);

      expect(input0).toBeOnTheScreen();
      expect(input1).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(input1, 'one invalid2');
      });
      const input2 = getInput(2);
      expect(input2).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(input2, 'invalid2 invalid3');
      });
      const input3 = getInput(3);
      expect(input3).toBeOnTheScreen();
    });

    it('show seedphrase modal when srp link is pressed', () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );
      const srpLink = getByTestId(
        ImportFromSeedSelectorsIDs.WHAT_IS_SEEDPHRASE_LINK_ID,
      );
      expect(srpLink).toBeOnTheScreen();
      fireEvent.press(srpLink);
    });

    it('update focused index on blur', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter a seed phrase to create multiple input fields
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(
          input,
          'say devote wasp video cool lunch brief add fever uncover novel offer',
        );
      });

      // Wait for the individual input fields to be created
      await waitFor(() => {
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`),
        ).toBeOnTheScreen();
      });

      const input0 = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
      );
      const input1 = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`,
      );

      // Test case 1: Focus on input 0, then blur from the same input
      // This should set the focused index to null
      fireEvent(input0, 'focus');
      fireEvent(input0, 'blur');

      // The input should handle the blur event without crashing
      expect(input0).toBeOnTheScreen();

      // Test case 2: Focus on input 0, then blur from a different input
      // This should not change the focused index
      fireEvent(input0, 'focus');
      fireEvent(input1, 'blur');

      // Both inputs should still be on screen and functional
      expect(input0).toBeOnTheScreen();
      expect(input1).toBeOnTheScreen();
    });

    it('valid seed word on blur', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter a seed phrase to create multiple input fields
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(
          input,
          'say devote wasp video cool lunch brief add fever uncover novel offer',
        );
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`),
        ).toBeOnTheScreen();
      });

      const input0 = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
      );

      // Test blur with a valid word ("say" is a valid BIP39 word)
      fireEvent.changeText(input0, 'say');
      fireEvent(input0, 'focus');
      fireEvent(input0, 'blur');

      // Should handle blur without issues
      expect(input0).toBeOnTheScreen();
      expect(input0.props.value).toBe('say');
    });

    it('invalid seed word on blur', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter a seed phrase to create multiple input fields
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(
          input,
          'say devote wasp video cool lunch brief add fever uncover novel offer',
        );
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`),
        ).toBeOnTheScreen();
      });

      const input0 = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
      );

      // Test blur with an invalid word
      fireEvent.changeText(input0, 'invalidword');
      fireEvent(input0, 'focus');
      fireEvent(input0, 'blur');

      // Should handle blur without issues even with invalid word
      expect(input0).toBeOnTheScreen();
      expect(input0.props.value).toBe('invalidword');
    });

    it('empty word on blur', async () => {
      const { getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter a seed phrase to create multiple input fields
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(
          input,
          'say devote wasp video cool lunch brief add fever uncover novel offer',
        );
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`),
        ).toBeOnTheScreen();
      });

      const input0 = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
      );

      // Test blur with empty word
      fireEvent.changeText(input0, '');
      fireEvent(input0, 'focus');
      fireEvent(input0, 'blur');

      // Should handle blur without issues even with empty word
      expect(input0).toBeOnTheScreen();
      expect(input0.props.value).toBe('');
    });

    it('shows "Paste" button initially and "Clear All" when user starts typing', async () => {
      const { getByText, getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Initially should show "Paste" button
      const pasteButton = getByText(strings('import_from_seed.paste'));
      expect(pasteButton).toBeOnTheScreen();

      // Type something to trigger hasStartedTyping
      const textArea = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(textArea, 'test');
      });

      // Should now show "Clear All" button
      const clearAllButton = getByText(strings('import_from_seed.clear_all'));
      expect(clearAllButton).toBeOnTheScreen();
    });

    it('switches back to "Paste" button when all content is cleared', async () => {
      const { getByText, getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Start with TextArea and type something
      const textArea = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(textArea, 'test');
      });

      // Verify "Clear All" button is shown
      const clearAllButton = getByText(strings('import_from_seed.clear_all'));
      expect(clearAllButton).toBeOnTheScreen();

      // Click "Clear All"
      fireEvent.press(clearAllButton);

      // Should switch back to "Paste" button
      const pasteButton = getByText(strings('import_from_seed.paste'));
      expect(pasteButton).toBeOnTheScreen();
    });

    it('switches back to TextArea when all individual fields are cleared', async () => {
      const { getByPlaceholderText, getByTestId, getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Start with TextArea and type something
      const textArea = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(textArea, 'test');
      });

      // Verify individual inputs are shown
      const firstInput = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
      );
      expect(firstInput).toBeOnTheScreen();

      // Clear the input
      await act(async () => {
        fireEvent.changeText(firstInput, '');
      });

      // Should switch back to TextArea
      const textAreaAfterClear = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      expect(textAreaAfterClear).toBeOnTheScreen();

      // Should show "Paste" button
      const pasteButton = getByText(strings('import_from_seed.paste'));
      expect(pasteButton).toBeOnTheScreen();
    });
  });

  describe('Create password UI', () => {
    const renderCreatePasswordUI = async () => {
      const { getByText, getByPlaceholderText, getByRole, getByTestId } =
        renderScreen(
          ImportFromSecretRecoveryPhrase,
          { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
          { state: initialState },
        );

      // Enter valid seed phrase and continue to step 2
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(
          input,
          'say devote wasp video cool lunch brief add fever uncover novel offer',
        );
      });

      const continueButton = getByRole('button', { name: 'Continue' });
      fireEvent.press(continueButton);

      return { getByText, getByPlaceholderText, getByRole, getByTestId };
    };

    it('renders create password UI', async () => {
      const { getByText } = await renderCreatePasswordUI();

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.metamask_password')),
        ).toBeOnTheScreen();
        expect(
          getByText(strings('import_from_seed.metamask_password_description')),
        ).toBeOnTheScreen();
        expect(
          getByText(strings('import_from_seed.create_new_password')),
        ).toBeOnTheScreen();
        expect(
          getByText(strings('import_from_seed.confirm_password')),
        ).toBeOnTheScreen();
      });
    });

    it('password strength indicator is shown on password input', async () => {
      const { getByText, getByPlaceholderText } =
        await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'weakpass');
      });

      await waitFor(() => {
        expect(getByText('Password strength: Weak')).toBeOnTheScreen();
      });

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass123!');
      });

      await waitFor(() => {
        expect(getByText('Password strength: Good')).toBeOnTheScreen();
      });
    });

    it('on clicking eye icon, password visibility is toggled', async () => {
      const { getByPlaceholderText, getByTestId } =
        await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );
      const confirmPasswordInput = getByPlaceholderText(
        strings('import_from_seed.re_enter_password'),
      );

      const newPasswordVisibilityIcon = getByTestId(
        ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID,
      );
      const confirmPasswordVisibilityIcon = getByTestId(
        ImportFromSeedSelectorsIDs.CONFIRM_PASSWORD_VISIBILITY_ID,
      );

      // Initially passwords should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

      // Toggle visibility for new password
      fireEvent.press(newPasswordVisibilityIcon);
      expect(passwordInput.props.secureTextEntry).toBe(false);

      // Toggle visibility for confirm password
      fireEvent.press(confirmPasswordVisibilityIcon);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(false);
    });

    it('error message is shown when passwords do not match', async () => {
      const { getByText, getByPlaceholderText } =
        await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );
      const confirmPasswordInput = getByPlaceholderText(
        strings('import_from_seed.re_enter_password'),
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'DifferentPass123!');

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.password_error')),
        ).toBeOnTheScreen();
      });
    });

    it('confirm password field is disabled until new password is entered', async () => {
      const { getByPlaceholderText } = await renderCreatePasswordUI();

      const confirmPasswordInput = getByPlaceholderText(
        strings('import_from_seed.re_enter_password'),
      );
      expect(confirmPasswordInput.props.editable).toBe(false);

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );
      fireEvent.changeText(passwordInput, 'StrongPass123!');

      await waitFor(() => {
        expect(confirmPasswordInput.props.editable).toBe(true);
      });
    });

    it('confirm password field is cleared when new password is removed', async () => {
      const { getByPlaceholderText } = await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass123!');
      });

      expect(passwordInput.props.value).toBe('StrongPass123!');

      const confirmPasswordInput = getByPlaceholderText(
        strings('import_from_seed.re_enter_password'),
      );

      await act(async () => {
        fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
      });

      expect(confirmPasswordInput.props.value).toBe('StrongPass123!');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass12');
      });

      expect(confirmPasswordInput.props.value).toBe('StrongPass123!');

      await act(async () => {
        fireEvent.changeText(passwordInput, '');
      });

      expect(confirmPasswordInput.props.value).toBe('');
    });

    it('minimum password length requirement message shown when create new password field value is less than 8 characters', async () => {
      const { getByText, getByPlaceholderText } =
        await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'Weak');
      });

      await waitFor(() => {
        expect(
          getByText(
            strings('choose_password.must_be_at_least', {
              number: MIN_PASSWORD_LENGTH,
            }),
          ),
        ).toBeOnTheScreen();
      });
    });

    it('confirm password field is focused when new password field is entered', async () => {
      const { getByPlaceholderText } = await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );
      const confirmPasswordInput = getByPlaceholderText(
        strings('import_from_seed.re_enter_password'),
      );

      // Enter password and press next
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent(passwordInput, 'submitEditing');

      // Verify that confirm password field is enabled and ready for input
      expect(confirmPasswordInput.props.editable).toBe(true);
      expect(confirmPasswordInput.props.value).toBe('');
    });

    it('navigates to Import Wallet UI when back button is pressed', async () => {
      const { getByTestId, getByText } = await renderCreatePasswordUI();

      // Verify we're on step 2
      expect(
        getByText(
          strings('import_from_seed.steps', {
            currentStep: 2,
            totalSteps: 2,
          }),
        ),
      ).toBeOnTheScreen();

      // Press back button
      const backButton = getByTestId(ImportFromSeedSelectorsIDs.BACK_BUTTON_ID);
      fireEvent.press(backButton);

      // Verify we're back on step 1
      await waitFor(() => {
        expect(
          getByText(
            strings('import_from_seed.steps', {
              currentStep: 1,
              totalSteps: 2,
            }),
          ),
        ).toBeOnTheScreen();
      });
    });

    it('renders learn more checkbox', async () => {
      const { getByTestId } = await renderCreatePasswordUI();

      const learnMoreCheckbox = getByTestId(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
      expect(learnMoreCheckbox).toBeOnTheScreen();
    });

    it('error message is shown when passcode is not set', async () => {
      const { getByText, getByPlaceholderText, getByTestId } =
        await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );
      const confirmPasswordInput = getByPlaceholderText(
        strings('import_from_seed.re_enter_password'),
      );

      // Enter valid passwords
      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass123!');
        fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
      });

      // Check learn more checkbox
      const learnMoreCheckbox = getByTestId(
        ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID,
      );
      fireEvent.press(learnMoreCheckbox);

      // Mock Authentication.newWalletAndRestore to throw passcode error
      jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockRejectedValueOnce(new Error('Error: Passcode not set.'));

      // Try to import
      const confirmButton = getByText(
        strings('import_from_seed.create_password_cta'),
      );
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(getByText('Unlock with Face ID?')).toBeOnTheScreen();
      });
    });

    it('Import seed phrase with optin metrics flow', async () => {
      mockIsEnabled.mockReturnValue(false);
      const { getByTestId, getByPlaceholderText } =
        await renderCreatePasswordUI();

      const passwordInput = getByPlaceholderText(
        strings('import_from_seed.enter_strong_password'),
      );
      const confirmPasswordInput = getByPlaceholderText(
        strings('import_from_seed.re_enter_password'),
      );
      // Enter valid passwords
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      // Check learn more checkbox
      const learnMoreCheckbox = getByTestId(
        ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID,
      );
      fireEvent.press(learnMoreCheckbox);
      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });

      // Mock Authentication.newWalletAndRestore
      jest.spyOn(Authentication, 'newWalletAndRestore').mockResolvedValueOnce();
      // Try to import
      const confirmButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      fireEvent.press(confirmButton);
    });
  });
});
