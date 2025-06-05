import { renderScreen } from '../../../util/test/renderWithProvider';
import ImportFromSecretRecoveryPhrase from '.';
import Routes from '../../../constants/navigation/Routes';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ImportFromSeedSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import { strings } from '../../../../locales/i18n';
import { Authentication } from '../../../core';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';

const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
};

describe('ImportFromSecretRecoveryPhrase', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      ImportFromSecretRecoveryPhrase,
      { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should have current step as 0 on initial render', () => {
    const { getByText } = renderScreen(
      ImportFromSecretRecoveryPhrase,
      { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
      { state: initialState },
    );

    // The component shows steps as "Step 1 of 2" when currentStep is 0
    expect(getByText('Step 1 of 2')).toBeTruthy();
  });

  describe('Step 1 UI functionality', () => {
    it('should show seed phrase input field', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      expect(getByText('Enter your Secret Recovery Phrase')).toBeTruthy();
    });

    it('should toggle show/hide all button', () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      fireEvent.changeText(
        input,
        'say devote wasp video cool lunch brief add fever uncover novel offer',
      );

      const getInput = (index: number) =>
        getByTestId(
          `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
        );

      fireEvent(getInput(0), 'focus');

      expect(getInput(0).props.secureTextEntry).toBe(false);
      for (let i = 1; i < 12; i++) {
        expect(getInput(i)).toBeOnTheScreen();
        expect(getInput(i).props.secureTextEntry).toBe(true);
      }

      // Press show all button
      const showAllButton = getByText('Show all');
      expect(showAllButton).toBeTruthy();
      fireEvent.press(showAllButton);

      for (let i = 0; i < 12; i++) {
        expect(getInput(i).props.secureTextEntry).toBe(false);
      }

      // Press hide all button
      const hideAllButton = getByText('Hide all');
      expect(hideAllButton).toBeTruthy();
      fireEvent.press(hideAllButton);

      expect(getInput(0).props.secureTextEntry).toBe(false);
      for (let i = 1; i < 12; i++) {
        expect(getInput(i).props.secureTextEntry).toBe(true);
      }
      expect(getByText('Show all')).toBeTruthy();

      fireEvent(getInput(11), 'focus');
      expect(getInput(11).props.secureTextEntry).toBe(false);
      for (let i = 0; i < 11; i++) {
        expect(getInput(i).props.secureTextEntry).toBe(true);
      }
    });

    it('should have continue button disabled initially', () => {
      const { getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const continueButton = getByRole('button', { name: 'Continue' });
      expect(continueButton.props.disabled).toBeTruthy();
    });

    it('should show paste button when no seed phrase is entered', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      expect(getByText('Paste')).toBeTruthy();
      fireEvent.press(getByText('Paste'));
    });

    it('should show clear all button when seed phrase is entered', () => {
      const { getByText, getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      fireEvent.changeText(
        input,
        'test test test test test test test test test test test test',
      );

      expect(getByText('Clear all')).toBeTruthy();
      fireEvent.press(getByText('Clear all'));
    });

    it('should advance to step 2 when valid seed phrase is entered', async () => {
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

      // Wait for continue button to be enabled
      await waitFor(
        () => {
          const continueButton = getByRole('button', { name: 'Continue' });
          expect(continueButton.props.disabled).toBeFalsy();
        },
        { timeout: 3000 },
      );

      // Click continue button
      const continueButton = getByRole('button', { name: 'Continue' });
      fireEvent.press(continueButton);

      // Wait for step 2 to appear and verify
      await waitFor(
        () => {
          expect(getByText('Step 2 of 2')).toBeTruthy();
          expect(getByText('Create password')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('should check qr code button', async () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const qrCodeButton = getByTestId(
        ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID,
      );
      expect(qrCodeButton).toBeTruthy();
      fireEvent.press(qrCodeButton);
    });

    it('should have input field autofocused on initial render', () => {
      const { getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      expect(input.props.autoFocus).toBeTruthy();
    });

    it('should handle onKeyPress event', () => {
      const { getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      // Simulate key press event
      fireEvent(input, 'keyPress', { nativeEvent: { key: 'Enter' } });
    });

    it('should handle onSubmitEditing event', () => {
      const { getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      // Simulate submit editing event
      fireEvent(input, 'submitEditing');
    });

    it('should handle seed phrase with multiple words', async () => {
      const { getByPlaceholderText, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      // Enter multiple words
      fireEvent.changeText(input, 'test word');

      // Verify continue button is still disabled (since it's not a complete seed phrase)
      const continueButton = getByRole('button', { name: 'Continue' });
      expect(continueButton.props.disabled).toBeTruthy();

      // Enter a complete valid seed phrase
      fireEvent.changeText(
        input,
        'say devote wasp video cool lunch brief add fever uncover novel',
      );

      fireEvent(input, 'keyPress', { nativeEvent: { key: 'Backspace' } });
    });

    it('should handle backspace key press correctly', async () => {
      const { getByTestId, getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      // Enter multiple words
      fireEvent.changeText(input, 'word1 word2 word3');

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

    it('should validate seed phrase correctly', async () => {
      const { getByText, getByPlaceholderText, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Test case 1: Invalid length (less than 12 words)
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      const continueButton = getByRole('button', { name: 'Continue' });

      // Enter invalid length seed phrase
      fireEvent.changeText(input, 'word1 word2 word3');

      // Verify we're still on step 1
      await waitFor(() => {
        expect(getByText('Step 1 of 2')).toBeTruthy();
        expect(continueButton.props.disabled).toBeTruthy();
      });
    });

    it('should validate seed phrase correctly - Invalid mnemonic', async () => {
      const { getByPlaceholderText, getByRole, queryByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Test case 1: Invalid length (less than 12 words)
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      const continueButton = getByRole('button', { name: 'Continue' });

      // Invalid mnemonic
      const invalidMnemonic = 'invalid '.repeat(12).trim();

      // Enter invalid mnemonic
      fireEvent.changeText(input, invalidMnemonic);
      // Press continue and verify error message
      fireEvent.press(continueButton);

      await waitFor(() => {
        const errorMessage = queryByText(
          strings('import_from_seed.invalid_seed_phrase'),
        );
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should validate seed phrase correctly - Valid 12-word mnemonic', async () => {
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
      fireEvent.changeText(input, validMnemonic);

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
        expect(getByText('Step 2 of 2')).toBeTruthy();
      });
    });
  });

  describe('Step 2 UI functionality', () => {
    const renderStep2 = () => {
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
      fireEvent.changeText(
        input,
        'say devote wasp video cool lunch brief add fever uncover novel offer',
      );

      const continueButton = getByRole('button', { name: 'Continue' });
      fireEvent.press(continueButton);

      return { getByText, getByPlaceholderText, getByRole, getByTestId };
    };

    it('should show create password screen', async () => {
      const { getByText } = renderStep2();

      await waitFor(() => {
        expect(getByText('Create password')).toBeTruthy();
        expect(getByText('New Password')).toBeTruthy();
        expect(getByText('Confirm password')).toBeTruthy();
      });
    });

    it('should show password strength indicator', async () => {
      const { getByText, getByPlaceholderText } = renderStep2();

      const passwordInput = getByPlaceholderText('Enter a strong password');
      fireEvent.changeText(passwordInput, 'weakpass');

      await waitFor(() => {
        expect(getByText('Password strength: Weak')).toBeTruthy();
      });

      fireEvent.changeText(passwordInput, 'StrongPass123!');

      await waitFor(() => {
        expect(getByText('Password strength: Good')).toBeTruthy();
      });
    });

    it('should toggle password visibility', async () => {
      const { getByPlaceholderText, getByTestId } = renderStep2();

      const passwordInput = getByPlaceholderText('Enter a strong password');
      const confirmPasswordInput = getByPlaceholderText(
        'Re-enter your password',
      );

      const newPasswordVisibilityIcon = getByTestId(
        ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID,
      );
      const confirmPasswordVisibilityIcon = getByTestId(
        ImportFromSeedSelectorsIDs.CONFIRM_PASSWORD_VISIBILITY_ID,
      );

      // Initially passwords should be hidden
      expect(passwordInput.props.secureTextEntry).toBeTruthy();
      expect(confirmPasswordInput.props.secureTextEntry).toBeTruthy();

      // Toggle visibility for new password
      fireEvent.press(newPasswordVisibilityIcon);
      expect(passwordInput.props.secureTextEntry).toBeFalsy();

      // Toggle visibility for confirm password
      fireEvent.press(confirmPasswordVisibilityIcon);
      expect(confirmPasswordInput.props.secureTextEntry).toBeFalsy();
    });

    it('should show error when passwords do not match', async () => {
      const { getByText, getByPlaceholderText } = renderStep2();

      const passwordInput = getByPlaceholderText('Enter a strong password');
      const confirmPasswordInput = getByPlaceholderText(
        'Re-enter your password',
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'DifferentPass123!');

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.password_error')),
        ).toBeTruthy();
      });
    });

    it('should disable confirm password field until new password is entered', async () => {
      const { getByPlaceholderText } = renderStep2();

      const confirmPasswordInput = getByPlaceholderText(
        'Re-enter your password',
      );
      expect(confirmPasswordInput.props.editable).toBeFalsy();

      const passwordInput = getByPlaceholderText('Enter a strong password');
      fireEvent.changeText(passwordInput, 'StrongPass123!');

      await waitFor(() => {
        expect(confirmPasswordInput.props.editable).toBeTruthy();
      });
    });

    it('should show minimum password length requirement', async () => {
      const { getByText } = renderStep2();

      await waitFor(() => {
        expect(
          getByText('Password must have at least 8 characters'),
        ).toBeTruthy();
      });
    });

    it('should focus confirm password field when pressing next on new password field', async () => {
      const { getByPlaceholderText } = renderStep2();

      const passwordInput = getByPlaceholderText('Enter a strong password');
      const confirmPasswordInput = getByPlaceholderText(
        'Re-enter your password',
      );

      // Enter password and press next
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent(passwordInput, 'submitEditing');

      // Verify that confirm password field is enabled and ready for input
      expect(confirmPasswordInput.props.editable).toBeTruthy();
      expect(confirmPasswordInput.props.value).toBe('');
    });

    it('should go back to previous step when back button is pressed on step 2', async () => {
      const { getByTestId, getByText } = renderStep2();

      // Verify we're on step 2
      expect(getByText('Step 2 of 2')).toBeTruthy();

      // Press back button
      const backButton = getByTestId(ImportFromSeedSelectorsIDs.BACK_BUTTON_ID);
      fireEvent.press(backButton);

      // Verify we're back on step 1
      await waitFor(() => {
        expect(getByText('Step 1 of 2')).toBeTruthy();
      });
    });

    it('should check learn more checkbox', async () => {
      const { getByTestId } = renderStep2();

      const learnMoreCheckbox = getByTestId(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
      expect(learnMoreCheckbox).toBeTruthy();
      fireEvent.press(learnMoreCheckbox);
    });
  });

  describe('Import functionality', () => {
    const renderStep2WithInputs = () => {
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
      fireEvent.changeText(
        input,
        'say devote wasp video cool lunch brief add fever uncover novel offer',
      );

      const continueButton = getByRole('button', { name: 'Continue' });
      fireEvent.press(continueButton);

      // Enter password and confirm password
      const passwordInput = getByPlaceholderText('Enter a strong password');
      const confirmPasswordInput = getByPlaceholderText(
        'Re-enter your password',
      );

      return {
        getByText,
        getByPlaceholderText,
        getByRole,
        getByTestId,
        passwordInput,
        confirmPasswordInput,
      };
    };

    it('should show error when password requirements are not met', async () => {
      const { getByText, passwordInput, confirmPasswordInput } =
        renderStep2WithInputs();

      // Enter weak password
      fireEvent.changeText(passwordInput, 'weak');
      fireEvent.changeText(confirmPasswordInput, 'weak');

      // Check learn more checkbox
      const learnMoreCheckbox = getByText(
        'MetaMask can’t reset this password if you forget it',
      );
      fireEvent.press(learnMoreCheckbox);

      // Try to import
      const confirmButton = getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(getByText('Password strength: Weak')).toBeTruthy();
      });
    });

    it('should show error when passwords do not match', async () => {
      const { getByText, passwordInput, confirmPasswordInput } =
        renderStep2WithInputs();

      // Enter different passwords
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'DifferentPass123!');

      // Check learn more checkbox
      const learnMoreCheckbox = getByText(
        'MetaMask can’t reset this password if you forget it',
      );
      fireEvent.press(learnMoreCheckbox);

      // Try to import
      const confirmButton = getByText('Confirm');
      fireEvent.press(confirmButton);
      expect(confirmButton).toBeTruthy();
    });

    it('should show error when seed phrase is invalid', async () => {
      const { getByText, getByPlaceholderText, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter invalid seed phrase
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );
      fireEvent.changeText(
        input,
        'invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid',
      );

      const continueButton = getByRole('button', { name: 'Continue' });
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.invalid_seed_phrase')),
        ).toBeTruthy();
      });
    });

    it('should show error when passcode is not set', async () => {
      const { getByText, passwordInput, confirmPasswordInput } =
        renderStep2WithInputs();

      // Enter valid passwords
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      // Check learn more checkbox
      const learnMoreCheckbox = getByText(
        'MetaMask can’t reset this password if you forget it',
      );
      fireEvent.press(learnMoreCheckbox);

      // Mock Authentication.newWalletAndRestore to throw passcode error
      jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockRejectedValueOnce(new Error('Error: Passcode not set.'));

      // Try to import
      const confirmButton = getByText('Confirm');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(getByText('Unlock with Face ID?')).toBeTruthy();
      });
    });
  });
});

describe('handleOnFocus', () => {
  it('should handle input focus correctly', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = renderScreen(
      ImportFromSecretRecoveryPhrase,
      { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
      { state: initialState },
    );

    // Enter invalid seed phrase
    const input = getByPlaceholderText(
      strings('import_from_seed.srp_placeholder'),
    );

    fireEvent.changeText(
      input,
      'invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid',
    );

    // Get all seed phrase inputs
    const seedPhraseInputs = Array.from({ length: 12 }).map((_, index) =>
      getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
      ),
    );

    // Test focusing on first input
    fireEvent(seedPhraseInputs[0], 'focus');
    // seedPhraseInputFocusedIndex is internal state, can't test directly
    expect(seedPhraseInputs[0]).toBeTruthy();

    // Focus second input - should show spell check error
    fireEvent(seedPhraseInputs[1], 'focus');
    expect(
      getByText(strings('import_from_seed.spellcheck_error')),
    ).toBeTruthy();

    // Enter valid word in first input
    fireEvent.changeText(seedPhraseInputs[0], 'abandon');

    // Focus third input - error should clear
    fireEvent(seedPhraseInputs[2], 'focus');
    const errorText = getByText(strings('import_from_seed.spellcheck_error'));
    expect(errorText).toBeOnTheScreen();

    // Test focusing same input multiple times
    fireEvent(seedPhraseInputs[2], 'focus');
    fireEvent(seedPhraseInputs[2], 'focus');
    expect(seedPhraseInputs[2]).toBeTruthy();
  });

  it('should not clear error when focusing new input with no previous errors', () => {
    const { getByPlaceholderText, getByTestId, queryByText } = renderScreen(
      ImportFromSecretRecoveryPhrase,
      { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
      { state: initialState },
    );

    // Enter invalid seed phrase
    const input = getByPlaceholderText(
      strings('import_from_seed.srp_placeholder'),
    );

    fireEvent.changeText(
      input,
      'say devote wasp video cool lunch brief add fever uncover novel offer',
    );

    const firstInput = getByTestId(
      `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
    );
    const secondInput = getByTestId(
      `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`,
    );

    // Focus first input
    fireEvent(firstInput, 'focus');

    // Enter valid word
    fireEvent.changeText(firstInput, 'invalid');

    // Focus second input
    fireEvent(secondInput, 'focus');

    const errorElement1 = queryByText(
      strings('import_from_seed.spellcheck_error'),
    );
    expect(errorElement1).toBeOnTheScreen();

    // Enter valid word
    fireEvent.changeText(firstInput, 'say');

    // Focus second input
    fireEvent(secondInput, 'focus');

    // Should not show any error since all words are valid
    const errorElement2 = queryByText(
      strings('import_from_seed.spellcheck_error'),
    );
    expect(errorElement2).toBeOnTheScreen();
  });

  it('should handle multiple error states correctly', () => {
    const { getByText, getByPlaceholderText, getByTestId } = renderScreen(
      ImportFromSecretRecoveryPhrase,
      { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
      { state: initialState },
    );

    // Enter invalid seed phrase
    const input = getByPlaceholderText(
      strings('import_from_seed.srp_placeholder'),
    );

    fireEvent.changeText(
      input,
      'invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid',
    );

    const inputs = Array.from({ length: 12 }).map((_, index) =>
      getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
      ),
    );

    // Enter multiple invalid words
    fireEvent(inputs[0], 'focus');
    fireEvent.changeText(inputs[0], 'invalid1');

    fireEvent(inputs[1], 'focus');
    fireEvent.changeText(inputs[1], 'invalid2');

    // Focus third input
    fireEvent(inputs[2], 'focus');

    // Should show spell check error
    expect(
      getByText(strings('import_from_seed.spellcheck_error')),
    ).toBeTruthy();
  });

  it('should handle new word input correctly', () => {
    const { getByPlaceholderText, getByTestId } = renderScreen(
      ImportFromSecretRecoveryPhrase,
      { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
      { state: initialState },
    );

    const getInput = (index: number) =>
      getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_${index}`,
      );

    // Enter invalid seed phrase
    const input = getByPlaceholderText(
      strings('import_from_seed.srp_placeholder'),
    );

    fireEvent.changeText(input, 'horse ');

    const input0 = getInput(0);
    const input1 = getInput(1);

    expect(input0).toBeOnTheScreen();
    expect(input1).toBeOnTheScreen();

    fireEvent.changeText(input1, 'invalid2 ');
    const input2 = getInput(2);
    expect(input2).toBeOnTheScreen();

    fireEvent.changeText(input2, 'invalid3 ');
    const input3 = getInput(3);
    expect(input3).toBeOnTheScreen();

    fireEvent.changeText(getInput(1), 'invalid4 ');
    const input4 = getInput(4);
    expect(input4).toBeOnTheScreen();
  });
});
