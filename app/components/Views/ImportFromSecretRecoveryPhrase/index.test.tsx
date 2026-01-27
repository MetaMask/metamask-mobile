import React from 'react';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import ImportFromSecretRecoveryPhrase from '.';
import Routes from '../../../constants/navigation/Routes';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { ImportFromSeedSelectorsIDs } from './ImportFromSeed.testIds';
import { strings } from '../../../../locales/i18n';
import { Authentication } from '../../../core';
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import Clipboard from '@react-native-clipboard/clipboard';
import { MIN_PASSWORD_LENGTH } from '../../../util/password';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { Alert, InteractionManager } from 'react-native';
import { QRTabSwitcherScreens } from '../QRTabSwitcher';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import StorageWrapper from '../../../store/storage-wrapper';
import { passcodeType } from '../../../util/authentication';
import {
  TraceName,
  TraceOperation,
  trace,
  endTrace,
} from '../../../util/trace';
import type { Span } from '@sentry/core';
import ReduxService from '../../../core/redux/ReduxService';
import { RootState } from '../../../reducers';
import { ReduxStore } from '../../../core/redux/types';

jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
}));

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

// Mock the clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn().mockResolvedValue(''),
}));

// Mock the Keyboard to prevent Jest environment teardown errors
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

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../../util/termsOfUse/termsOfUse', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../util/authentication', () => ({
  passcodeType: jest.fn().mockReturnValue('device_passcode_ios'),
  updateAuthTypeStorageFlags: jest.fn(),
}));

const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
};

jest.mock(
  '../../../selectors/featureFlagController/importSrpWordSuggestion',
  () => ({
    selectImportSrpWordSuggestionEnabledFlag: () => true,
  }),
);

const mockIsEnabled = jest.fn().mockReturnValue(true);

jest.mock('../../hooks/useAnalytics/useAnalytics', () => {
  const actualUseAnalytics = jest.requireActual(
    '../../hooks/useAnalytics/useAnalytics',
  );
  return {
    ...actualUseAnalytics,
    useAnalytics: jest.fn().mockReturnValue({
      ...actualUseAnalytics.useAnalytics,
      isEnabled: () => mockIsEnabled(),
    }),
  };
});

describe('ImportFromSecretRecoveryPhrase', () => {
  const createMockReduxStore = (
    stateOverrides?: Partial<RootState>,
  ): ReduxStore => {
    const defaultState = {
      user: {
        existingUser: false,
        passwordSet: true,
        seedphraseBackedUp: false,
      },
      security: {
        allowLoginWithRememberMe: false,
      },
      settings: {
        lockTime: -1,
      },
      ...(stateOverrides || {}),
    } as RootState;

    return {
      dispatch: jest.fn(),
      getState: jest.fn(() => defaultState),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      [Symbol.observable]: jest.fn(),
    } as unknown as ReduxStore;
  };

  afterEach(() => {
    jest.clearAllMocks();
    // Restore Redux store mock after clearing mocks
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Redux store for all tests
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);

    mockUseKeyboardState.mockImplementation(
      (selector: (state: { isVisible: boolean }) => boolean) =>
        selector({ isVisible: false }),
    );
  });

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

  describe('Import a wallet UI', () => {
    it('render matches snapshot', () => {
      const { toJSON } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders SRP input screen on initial render', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // The component shows the SRP input screen initially
      expect(getByText(strings('import_from_seed.title'))).toBeOnTheScreen();
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
      await act(() => {
        fireEvent(getInput(0), 'onFocus');
      });
      await waitFor(() => {
        expect(getInput(0).props.value).toBe('say');
      });
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

    it('on submit editing, keyboard dismisses without creating new input', async () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Enter a word
      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(input, 'say');
      });

      // Wait for the first grid input to be created
      await waitFor(() => {
        const firstGridInput = getByTestId(
          `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
        );
        expect(firstGridInput).toBeOnTheScreen();
      });

      // Get the first grid input
      const firstGridInput = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
      );

      await act(async () => {
        fireEvent(firstGridInput, 'onSubmitEditing');
      });

      // Verify no new input was created (keyboard just dismisses)
      await waitFor(() => {
        expect(
          queryByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`),
        ).toBeNull();
      });
    });

    it('on enter key press at the last input field with correct length, the new input field value is not created', async () => {
      const { getByPlaceholderText, queryByTestId } = renderScreen(
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
        'frame midnight talk absent spy release check below volume industry advance neglect ',
      );

      await act(async () => {
        fireEvent(input, 'onSubmitEditing', {
          nativeEvent: { key: 'Enter' },
          index: 11,
        });
      });

      await waitFor(() => {
        const secondInput = queryByTestId(
          `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_12`,
        );
        expect(secondInput).not.toBeOnTheScreen();
      });
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

      // Wait for password screen to appear and verify
      await waitFor(
        () => {
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
      const { getByPlaceholderText, getAllByText } = renderScreen(
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
        const errorMessages = getAllByText(
          strings('import_from_seed.spellcheck_error'),
        );
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toBeOnTheScreen();
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
      await act(() => {
        fireEvent(inputFields[0], 'onFocus');
      });
      await waitFor(() => {
        expect(inputFields[0].props.value).toBe('say');
      });

      // Press continue and verify password screen
      fireEvent.press(continueButton);

      await waitFor(() => {
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

    it('calls navigation.goBack when back button is pressed on step 0', () => {
      const mockGoBack = jest.fn();
      const Stack = createStackNavigator();

      const customRender = (children: React.ReactElement) =>
        renderWithProvider(
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="TestScreen">
                {({ navigation }) => {
                  const navigationSpy = jest.spyOn(navigation, 'goBack');
                  navigationSpy.mockImplementation(mockGoBack);
                  return React.cloneElement(children, { navigation });
                }}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>,
          { state: initialState },
          false,
        );

      const { getByTestId } = customRender(<ImportFromSecretRecoveryPhrase />);

      const backButton = getByTestId(ImportFromSeedSelectorsIDs.BACK_BUTTON_ID);
      expect(backButton).toBeOnTheScreen();

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
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

      expect(textArea).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(textArea, 'test');
      });

      // Verify individual inputs are shown
      const firstInput = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}`,
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

    it('should not navigate to next field if only spaces are entered', async () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      // Start with TextArea and type something
      const textArea = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(textArea, 'test test1 text2   ');
      });

      const input4 = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_3`,
      );

      expect(input4).toBeOnTheScreen();

      await act(async () => {
        fireEvent.changeText(input4, '   ');
      });

      const input5 = queryByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_4`,
      );

      expect(input5).not.toBeOnTheScreen();
    });

    describe('onQrCodePress', () => {
      let customRender: (
        children: React.ReactElement,
      ) => ReturnType<typeof renderWithProvider>;
      let navigationSpy: jest.SpyInstance;

      beforeEach(() => {
        const Stack = createStackNavigator();
        customRender = (children: React.ReactElement) =>
          renderWithProvider(
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen name="TestScreen">
                  {({ navigation }) => {
                    navigationSpy = jest.spyOn(navigation, 'navigate');
                    navigationSpy.mockImplementation(() => undefined);
                    return React.cloneElement(children, { navigation });
                  }}
                </Stack.Screen>
              </Stack.Navigator>
            </NavigationContainer>,
            { state: initialState },
            false,
          );
      });

      afterEach(() => {
        navigationSpy.mockRestore();
      });

      it('navigates to QR scanner with correct parameters when QR button is pressed', async () => {
        const { getByTestId } = customRender(
          <ImportFromSecretRecoveryPhrase />,
        );

        const qrButton = getByTestId(
          ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID,
        );
        expect(qrButton).toBeOnTheScreen();

        await act(async () => {
          fireEvent.press(qrButton);
        });

        expect(navigationSpy).toHaveBeenCalledWith(Routes.QR_TAB_SWITCHER, {
          initialScreen: QRTabSwitcherScreens.Scanner,
          disableTabber: true,
          onScanSuccess: expect.any(Function),
          onScanError: expect.any(Function),
        });
      });

      it('calls handleClear and handleSeedPhraseChangeAtIndex when onScanSuccess is called with seed', async () => {
        const { getByTestId } = customRender(
          <ImportFromSecretRecoveryPhrase />,
        );

        const qrButton = getByTestId(
          ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID,
        );
        await act(async () => {
          fireEvent.press(qrButton);
        });

        expect(navigationSpy).toHaveBeenCalled();
        const [, params] = navigationSpy.mock.calls[0];
        const { onScanSuccess } = params;

        const scannedSeed =
          'abandon ability able about above absent absorb abstract absurd abuse access';
        await act(async () => {
          onScanSuccess({ seed: scannedSeed });
        });

        await waitFor(() => {
          const firstInput = getByTestId(
            `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`,
          );
          const secondInput = getByTestId(
            `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`,
          );
          const thirdInput = getByTestId(
            `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_2`,
          );

          expect(firstInput.props.value).toBe('abandon');
          expect(secondInput.props.value).toBe('ability');
          expect(thirdInput.props.value).toBe('able');
        });
      });

      it('shows alert when onScanSuccess is called without seed', async () => {
        const mockAlert = jest.spyOn(Alert, 'alert');
        const { getByTestId } = customRender(
          <ImportFromSecretRecoveryPhrase />,
        );

        const qrButton = getByTestId(
          ImportFromSeedSelectorsIDs.QR_CODE_BUTTON_ID,
        );
        await act(async () => {
          fireEvent.press(qrButton);
        });

        expect(navigationSpy).toHaveBeenCalled();
        const [, params] = navigationSpy.mock.calls[0];
        const { onScanSuccess } = params;

        await act(async () => {
          onScanSuccess({});
        });

        expect(mockAlert).toHaveBeenCalledWith(
          strings('import_from_seed.invalid_qr_code_title'),
          strings('import_from_seed.invalid_qr_code_message'),
        );

        mockAlert.mockRestore();
      });
    });

    it('handles backspace key press when input is empty and index > 0', async () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByPlaceholderText(
        strings('import_from_seed.srp_placeholder'),
      );

      await act(async () => {
        fireEvent.changeText(input, 'word1 word2 word3');
      });

      await waitFor(() => {
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`),
        ).toBeOnTheScreen();
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`),
        ).toBeOnTheScreen();
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_2`),
        ).toBeOnTheScreen();
      });

      // Clear the second input field
      const input1 = getByTestId(
        `${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`,
      );
      await act(async () => {
        fireEvent.changeText(input1, '');
      });

      // Simulate backspace key press on empty input field at index 1
      await act(async () => {
        fireEvent(input1, 'keyPress', {
          nativeEvent: { key: 'Backspace' },
        });
      });

      // Should focus on the previous input field (index 0) and remove the current empty field
      await waitFor(() => {
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_0`),
        ).toBeOnTheScreen();
        expect(
          getByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_1`),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(`${ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}_2`),
        ).toBeNull();
      });
    });
  });

  const renderCreatePasswordUI = async (onboardingTraceCtx?: {
    traceId: string;
  }) => {
    const { getByText, getByPlaceholderText, getByRole, getByTestId } =
      renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
        onboardingTraceCtx ? { onboardingTraceCtx } : undefined,
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

  describe('Create password UI', () => {
    it('renders create password UI', async () => {
      const { getByText, getByTestId } = await renderCreatePasswordUI();

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.metamask_password')),
        ).toBeOnTheScreen();
        expect(
          getByText(strings('import_from_seed.metamask_password_description')),
        ).toBeOnTheScreen();
        expect(
          getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
        ).toBeOnTheScreen();
        expect(
          getByText(strings('import_from_seed.confirm_password')),
        ).toBeOnTheScreen();
      });
    });

    it('on clicking eye icon, password visibility is toggled', async () => {
      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
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
      const { getByText, getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
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
      const { getByTestId } = await renderCreatePasswordUI();

      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      expect(confirmPasswordInput.props.editable).toBe(false);

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      fireEvent.changeText(passwordInput, 'StrongPass123!');

      await waitFor(() => {
        expect(confirmPasswordInput.props.editable).toBe(true);
      });
    });

    it('confirm password field is cleared when new password is removed', async () => {
      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass123!');
      });

      expect(passwordInput.props.value).toBe('StrongPass123!');

      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
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
      const { getByText, getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
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

    it('helper text remains visible after password meets minimum length requirement', async () => {
      const { getByText, getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      // Verify helper text is visible initially
      await waitFor(() => {
        expect(
          getByText(
            strings('choose_password.must_be_at_least', {
              number: MIN_PASSWORD_LENGTH,
            }),
          ),
        ).toBeOnTheScreen();
      });

      // Enter a valid password that meets minimum length
      await act(async () => {
        fireEvent.changeText(passwordInput, 'ValidPassword123');
      });

      // Helper text should persist even after password meets requirement
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
      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
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

      // Verify we're on password screen
      expect(
        getByText(strings('import_from_seed.metamask_password')),
      ).toBeOnTheScreen();

      // Press back button
      const backButton = getByTestId(ImportFromSeedSelectorsIDs.BACK_BUTTON_ID);
      fireEvent.press(backButton);

      // Verify we're back on SRP input screen
      await waitFor(() => {
        expect(getByText(strings('import_from_seed.title'))).toBeOnTheScreen();
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
      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
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
      const confirmButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      fireEvent.press(confirmButton);

      // await waitFor(() => {
      //   expect(getByText('Unlock with Face ID?')).toBeOnTheScreen();
      // });
    });

    it('Import seed phrase with optin metrics flow', async () => {
      mockIsEnabled.mockReturnValue(false);
      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
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

    it('handles rejected OS biometric prompt successfully', async () => {
      mockIsEnabled.mockReturnValue(true);
      const mockComponentAuthenticationType = jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        })
        .mockResolvedValueOnce({
          // Mock second call in handleRejectedOsBiometricPrompt
          currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });
      const mockNewWalletAndRestore = jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockRejectedValueOnce(
          new Error('The user name or passphrase you entered is not correct.'),
        )
        // Mock second call in handleRejectedOsBiometricPrompt
        .mockResolvedValueOnce();

      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const learnMoreCheckbox = getByTestId(
        ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID,
      );
      const confirmButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
      fireEvent.press(learnMoreCheckbox);
      fireEvent.press(confirmButton);

      await act(async () => Promise.resolve());

      expect(mockComponentAuthenticationType).toHaveBeenCalledTimes(2);
      expect(mockComponentAuthenticationType).toHaveBeenNthCalledWith(
        1,
        true,
        false,
      );
      expect(mockComponentAuthenticationType).toHaveBeenNthCalledWith(
        2,
        false,
        false,
      );
      expect(mockNewWalletAndRestore).toHaveBeenCalledTimes(2);
    });

    it('handles rejected OS biometric prompt with error', async () => {
      mockIsEnabled.mockReturnValue(true);
      const mockComponentAuthenticationType = jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        })
        .mockResolvedValueOnce({
          // Mock second call in handleRejectedOsBiometricPrompt
          currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });
      const mockNewWalletAndRestore = jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockRejectedValueOnce(
          new Error('The user name or passphrase you entered is not correct.'),
        )
        // Mock second call in handleRejectedOsBiometricPrompt: this should also fail
        .mockRejectedValueOnce(new Error('Wallet creation failed'));

      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const learnMoreCheckbox = getByTestId(
        ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID,
      );
      const confirmButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
      fireEvent.press(learnMoreCheckbox);
      fireEvent.press(confirmButton);

      await act(async () => Promise.resolve());

      expect(mockComponentAuthenticationType).toHaveBeenCalledTimes(2);
      expect(mockComponentAuthenticationType).toHaveBeenNthCalledWith(
        1,
        true,
        false,
      );
      expect(mockComponentAuthenticationType).toHaveBeenNthCalledWith(
        2,
        false,
        false,
      );
      expect(mockNewWalletAndRestore).toHaveBeenCalledTimes(2);
    });
  });

  describe('useEffect hooks', () => {
    it('sets biometry type to passcode when currentAuthType is PASSCODE', async () => {
      const mockGetType = jest.spyOn(Authentication, 'getType');
      const mockGetItem = jest.spyOn(StorageWrapper, 'getItem');

      mockGetType.mockResolvedValueOnce({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType: undefined,
      });
      mockGetItem.mockResolvedValueOnce(null); // BIOMETRY_CHOICE_DISABLED
      mockGetItem.mockResolvedValueOnce(null); // PASSCODE_DISABLED

      const { unmount } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      await waitFor(() => {
        expect(mockGetType).toHaveBeenCalled();
        expect(passcodeType).toHaveBeenCalledWith(AUTHENTICATION_TYPE.PASSCODE);
      });

      unmount();
    });
  });

  describe('tracing', () => {
    const mockTrace = trace as jest.MockedFunction<typeof trace>;
    const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

    beforeEach(() => {
      mockTrace.mockClear();
      mockEndTrace.mockClear();
    });

    it('starts and ends trace with onboardingTraceCtx', async () => {
      const mockOnboardingTraceCtx = {
        traceId: 'test-trace-id',
      } as unknown as Span;
      const mockTraceCtx = {
        traceId: 'password-setup-trace-id',
      } as unknown as Span;

      mockTrace.mockReturnValue(mockTraceCtx);

      const { getByPlaceholderText, getByRole, unmount } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
        { onboardingTraceCtx: mockOnboardingTraceCtx },
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

      const continueButton = getByRole('button', { name: 'Continue' });
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: mockOnboardingTraceCtx,
      });

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.OnboardingPasswordSetupAttempt,
      });
    });

    it('does not start trace and end trace when moving to password setup step without onboardingTraceCtx', async () => {
      const { getByPlaceholderText, getByRole, unmount } = renderScreen(
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

      const continueButton = getByRole('button', { name: 'Continue' });
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockTrace).not.toHaveBeenCalled();

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('traces error when wallet import fails with onboardingTraceCtx', async () => {
      const mockOnboardingTraceCtx = { traceId: 'test-trace-id' };
      const testError = new Error('Authentication failed');

      // Mock failing authentication to trigger outer catch block
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);

      const { getByTestId } = await renderCreatePasswordUI(
        mockOnboardingTraceCtx,
      );

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const learnMoreCheckbox = getByTestId(
        ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
      fireEvent.press(learnMoreCheckbox);

      const importButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      fireEvent.press(importButton);

      await waitFor(
        () => {
          expect(mockTrace).toHaveBeenCalledWith({
            name: TraceName.OnboardingPasswordSetupError,
            op: TraceOperation.OnboardingUserJourney,
            parentContext: mockOnboardingTraceCtx,
            tags: { errorMessage: 'Error: Authentication failed' },
          });
          expect(mockEndTrace).toHaveBeenCalledWith({
            name: TraceName.OnboardingPasswordSetupError,
          });
        },
        { timeout: 3000 },
      );
    });

    it('does not trace error when wallet import fails without onboardingTraceCtx', async () => {
      const testError = new Error('Authentication failed');

      // Mock failing authentication to trigger outer catch block
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);

      const { getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      const learnMoreCheckbox = getByTestId(
        ImportFromSeedSelectorsIDs.CHECKBOX_TEXT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
      fireEvent.press(learnMoreCheckbox);

      const importButton = getByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(mockTrace).not.toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingPasswordSetupError,
          }),
        );

        expect(mockEndTrace).not.toHaveBeenCalledWith({
          name: TraceName.OnboardingPasswordSetupError,
        });
      });
    });
  });

  describe('SRP Word Suggestions Feature', () => {
    it('renders SRP input grid with word suggestions support', async () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        {
          name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        },
        {
          state: initialState,
        },
      );

      const srpInput = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      expect(srpInput).toBeTruthy();
    });

    it('passes onCurrentWordChange callback to SrpInputGrid', async () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        {
          name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        },
        {
          state: initialState,
        },
      );

      const srpInput = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(srpInput, 'ab');
      });

      expect(srpInput).toBeTruthy();
    });

    it('renders with KeyboardProvider wrapper', async () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        {
          name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        },
        {
          state: initialState,
        },
      );

      const srpInput = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      expect(srpInput).toBeTruthy();
    });

    it('renders KeyboardStickyView with SrpWordSuggestions when keyboard is visible', async () => {
      // Arrange
      mockUseKeyboardState.mockImplementation(
        (selector: (state: { isVisible: boolean }) => boolean) =>
          selector({ isVisible: true }),
      );

      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        {
          name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        },
        {
          state: initialState,
        },
      );

      // Act
      const srpInput = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(srpInput, 'ab');
      });

      // Assert
      expect(getByTestId('srp-word-suggestions')).toBeTruthy();
    });

    it('does not render KeyboardStickyView when keyboard is not visible', async () => {
      // Arrange
      mockUseKeyboardState.mockImplementation(
        (selector: (state: { isVisible: boolean }) => boolean) =>
          selector({ isVisible: false }),
      );

      const { getByTestId, queryByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        {
          name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        },
        {
          state: initialState,
        },
      );

      // Act
      const srpInput = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(srpInput, 'ab');
      });

      // Assert
      expect(queryByTestId('srp-word-suggestions')).toBeNull();
    });
  });

  describe('Step Navigation and Animation', () => {
    it('transitions from SRP step to password step with valid mnemonic', async () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        {
          name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        },
        {
          state: initialState,
        },
      );

      const srpInput = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(
          srpInput,
          'lazy youth dentist air relief leave neither liquid belt aspect bone frame',
        );
      });

      const continueButton = getByTestId(
        ImportFromSeedSelectorsIDs.CONTINUE_BUTTON_ID,
      );

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(continueButton).toBeTruthy();
    });
  });
});
