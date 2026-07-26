import React from 'react';
import baseRenderWithProvider, {
  renderScreen as baseRenderScreen,
} from '../../../util/test/renderWithProvider';
import ReduxService from '../../../core/redux';
import type { ReduxStore } from '../../../core/redux/types';
import ImportFromSecretRecoveryPhrase from '.';
import Routes from '../../../constants/navigation/Routes';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { ImportFromSeedSelectorsIDs } from './ImportFromSeed.testIds';
import { strings } from '../../../../locales/i18n';
import { Authentication } from '../../../core';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword/ChoosePassword.testIds';
import Clipboard from '@react-native-clipboard/clipboard';
import { MIN_PASSWORD_LENGTH } from '../../../util/password';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { Alert, InteractionManager } from 'react-native';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { QRTabSwitcherScreens } from '../QRTabSwitcher';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import { QrSyncSecretTypes } from '../../../core/QrSync/constants';

const mockQrSyncResetState = jest.fn();

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      QrSyncController: {
        resetState: () => mockQrSyncResetState(),
      },
    },
  },
}));

jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => {
  const keyboard = {
    dismiss: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
  };
  return { __esModule: true, default: keyboard, ...keyboard };
});

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

const mockCaptureException = jest.fn();
jest.mock('@sentry/react-native', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
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
  engine: {
    backgroundState: {
      QrSyncController: {
        ...defaultQrSyncControllerState,
      },
    },
  },
};

// A valid 12-word BIP39 mnemonic used across the happy-path tests.
const VALID_SEED_PHRASE =
  'say devote wasp video cool lunch brief add fever uncover novel offer';

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

function renderWithProvider(
  ...args: Parameters<typeof baseRenderWithProvider>
) {
  const result = baseRenderWithProvider(...args);
  ReduxService.store = result.store as unknown as ReduxStore;
  return result;
}

function renderScreen(...args: Parameters<typeof baseRenderScreen>) {
  const result = baseRenderScreen(...args);
  ReduxService.store = result.store as unknown as ReduxStore;
  return result;
}

/**
 * Confirms the wallet import from the password step.
 *
 * The redesigned step-1 CTA no longer imports directly. It opens a warning
 * BottomSheet; the actual import happens when the user taps "I understand".
 */
const confirmImportFromWarning = async (
  getByTestId: (id: string) => Parameters<typeof fireEvent.press>[0],
  getByText: (text: string) => Parameters<typeof fireEvent.press>[0],
) => {
  await act(async () => {
    fireEvent.press(getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID));
  });

  await act(async () => {
    fireEvent.press(getByText(strings('import_from_seed.i_understand')));
  });
};

describe('ImportFromSecretRecoveryPhrase', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    it('renders SRP input screen on initial render', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

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
          { exact: false },
        ),
      ).toBeOnTheScreen();
    });

    it('renders the seed phrase text area with the short placeholder', () => {
      const { getByTestId, getByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      expect(
        getByTestId(ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID),
      ).toBeOnTheScreen();
      expect(
        getByPlaceholderText(strings('import_from_seed.srp_placeholder_short')),
      ).toBeOnTheScreen();
    });

    it('renders the SRP footnote below the input', () => {
      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      expect(
        getByText(strings('import_from_seed.srp_footnote')),
      ).toBeOnTheScreen();
    });

    it('renders continue button disabled initially', () => {
      const { getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const continueButton = getByRole('button', { name: 'Continue' });
      expect(continueButton).toBeDisabled();
    });

    it('renders paste pill in the keyboard accessory bar when the keyboard is visible', async () => {
      mockUseKeyboardState.mockImplementation(
        (selector: (state: { isVisible: boolean }) => boolean) =>
          selector({ isVisible: true }),
      );

      const { getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      jest.mocked(Clipboard.getString).mockResolvedValue('test');
      const pasteButton = getByText(strings('import_from_seed.paste'));
      expect(pasteButton).toBeOnTheScreen();
      await act(async () => {
        fireEvent.press(pasteButton);
      });
      jest.mocked(Clipboard.getString).mockResolvedValue('');
    });

    it('populates the seed phrase text area when a 12 word phrase is entered', async () => {
      const { getByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(input, VALID_SEED_PHRASE);
      });

      expect(input.props.value).toBe(VALID_SEED_PHRASE);
    });

    it('on valid seed phrase entered, continue button is enabled', async () => {
      const { getByTestId, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
      fireEvent.changeText(input, VALID_SEED_PHRASE);

      const continueButton = getByRole('button', { name: 'Continue' });
      await waitFor(
        () => {
          expect(continueButton).toBeEnabled();
        },
        { timeout: 3000 },
      );
    });

    it('renders qr code button when the keyboard is visible', () => {
      mockUseKeyboardState.mockImplementation(
        (selector: (state: { isVisible: boolean }) => boolean) =>
          selector({ isVisible: true }),
      );

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
      const { getByText, getByTestId, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
      fireEvent.changeText(input, VALID_SEED_PHRASE);

      const continueButton = getByRole('button', { name: 'Continue' });

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(
        () => {
          expect(
            getByText(strings('import_from_seed.metamask_password')),
          ).toBeOnTheScreen();
        },
        { timeout: 3000 },
      );
    });

    it('on entering a 12 word seed phrase, continue button is enabled', async () => {
      const { getByTestId, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(
          input,
          'frame midnight talk absent spy release check below volume industry advance neglect',
        );
      });

      const continueButton = getByRole('button', { name: 'Continue' });
      expect(continueButton).toBeEnabled();
    });

    it('on entering an invalid seed phrase and pressing continue, an error message is shown', async () => {
      const { getByTestId, getByRole, getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      // 12 words (valid length) but an invalid mnemonic.
      const invalidMnemonic = 'invalid '.repeat(12).trim();

      await act(async () => {
        fireEvent.changeText(input, invalidMnemonic);
      });

      const continueButton = getByRole('button', { name: 'Continue' });
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.invalid_seed_phrase')),
        ).toBeOnTheScreen();
      });
    });

    it('on entering a valid seed phrase, continue button is enabled and it navigates to create password UI', async () => {
      const { getByText, getByTestId, getByRole } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
      const continueButton = getByRole('button', { name: 'Continue' });

      await act(async () => {
        fireEvent.changeText(input, VALID_SEED_PHRASE);
      });

      expect(input.props.value).toBe(VALID_SEED_PHRASE);

      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.metamask_password')),
        ).toBeOnTheScreen();
      });
    });

    it('calls navigation.goBack when back button is pressed on step 0', () => {
      const mockGoBack = jest.fn();
      const Stack = createNativeStackNavigator();

      const customRender = (children: React.ReactElement) =>
        renderWithProvider(
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="TestScreen">
                {({ navigation }) => {
                  const navigationSpy = jest.spyOn(navigation, 'goBack');
                  navigationSpy.mockImplementation(mockGoBack);
                  return React.cloneElement(
                    children as React.ReactElement<{ navigation?: unknown }>,
                    { navigation },
                  );
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

    describe('onQrCodePress', () => {
      let customRender: (
        children: React.ReactElement,
      ) => ReturnType<typeof renderWithProvider>;
      let navigationSpy: jest.SpyInstance;

      beforeEach(() => {
        // The QR pill lives in the keyboard accessory bar, which only renders
        // when the keyboard is visible.
        mockUseKeyboardState.mockImplementation(
          (selector: (state: { isVisible: boolean }) => boolean) =>
            selector({ isVisible: true }),
        );

        const Stack = createNativeStackNavigator();
        customRender = (children: React.ReactElement) =>
          renderWithProvider(
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen name="TestScreen">
                  {({ navigation }) => {
                    navigationSpy = jest.spyOn(navigation, 'navigate');
                    navigationSpy.mockImplementation(() => undefined);
                    return React.cloneElement(
                      children as React.ReactElement<{ navigation?: unknown }>,
                      { navigation },
                    );
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

      it('populates the seed phrase text area when onScanSuccess is called with a seed', async () => {
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
          const input = getByTestId(
            ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
          );
          expect(input.props.value).toBe(scannedSeed);
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
  });

  describe('QR sync import flow', () => {
    const qrSyncMnemonic = VALID_SEED_PHRASE;

    const qrSyncImportState = {
      ...initialState,
      engine: {
        backgroundState: {
          QrSyncController: {
            ...defaultQrSyncControllerState,
            pendingSecretImports: [
              {
                index: 0,
                value: qrSyncMnemonic,
                type: QrSyncSecretTypes.MNEMONIC,
                isPrimary: true,
              },
            ],
          },
        },
      },
    };

    it('renders the import-from-extension link when add-device sync is enabled', () => {
      const stateWithAddDeviceSync = {
        ...initialState,
        engine: {
          backgroundState: {
            ...initialState.engine.backgroundState,
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                addDeviceSyncEnabled: true,
              },
            },
          },
        },
      };

      const { getByTestId, getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: stateWithAddDeviceSync },
      );

      expect(
        getByTestId(ImportFromSeedSelectorsIDs.IMPORT_FROM_EXTENSION_LINK_ID),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('import_from_seed.import_from_extension_row')),
      ).toBeOnTheScreen();
    });

    it('prefills the seed phrase and opens the password step for QR sync imports', async () => {
      const { getByText, queryByPlaceholderText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: qrSyncImportState },
        { qrSyncImport: true },
      );

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.metamask_password')),
        ).toBeOnTheScreen();
      });

      expect(
        queryByPlaceholderText(
          strings('import_from_seed.srp_placeholder_short'),
        ),
      ).toBeNull();
    });

    it('calls navigation.goBack when back is pressed on the password step', async () => {
      const mockGoBack = jest.fn();
      const Stack = createNativeStackNavigator();

      const { getByTestId } = renderWithProvider(
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name={Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE}
              initialParams={{ qrSyncImport: true }}
            >
              {({ navigation, route }) => {
                jest.spyOn(navigation, 'goBack').mockImplementation(mockGoBack);
                return (
                  <ImportFromSecretRecoveryPhrase
                    navigation={navigation}
                    route={route}
                  />
                );
              }}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>,
        { state: qrSyncImportState },
        false,
      );

      await waitFor(() => {
        expect(
          getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        ).toBeOnTheScreen();
      });

      fireEvent.press(getByTestId(ImportFromSeedSelectorsIDs.BACK_BUTTON_ID));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockQrSyncResetState).toHaveBeenCalledTimes(1);
    });

    it('does not prefill the seed phrase when qrSyncImport is false', async () => {
      const { getByPlaceholderText, queryByTestId } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: qrSyncImportState },
      );

      expect(
        getByPlaceholderText(strings('import_from_seed.srp_placeholder_short')),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
      ).toBeNull();
    });

    it('preserves QR sync provisioning state after a successful vault import', async () => {
      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });
      const newWalletAndRestoreSpy = jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockResolvedValueOnce();

      const { getByTestId, getByText } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: qrSyncImportState },
        { qrSyncImport: true },
      );

      await waitFor(() => {
        expect(
          getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        ).toBeOnTheScreen();
      });

      fireEvent.changeText(
        getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        'StrongPass123!',
      );
      fireEvent.changeText(
        getByTestId(ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID),
        'StrongPass123!',
      );

      await confirmImportFromWarning(getByTestId, getByText);

      await waitFor(() => {
        expect(newWalletAndRestoreSpy).toHaveBeenCalledTimes(1);
      });

      expect(mockQrSyncResetState).not.toHaveBeenCalled();
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
    const input = getByTestId(ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID);

    await act(async () => {
      fireEvent.changeText(input, VALID_SEED_PHRASE);
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
      });
    });

    it('renders the password fields with the new placeholders', async () => {
      const { getByPlaceholderText } = await renderCreatePasswordUI();

      await waitFor(() => {
        expect(
          getByPlaceholderText(
            strings('import_from_seed.new_password_placeholder'),
          ),
        ).toBeOnTheScreen();
        expect(
          getByPlaceholderText(
            strings('import_from_seed.confirm_password_placeholder'),
          ),
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
      expect(passwordInput).toHaveProp('secureTextEntry', true);
      expect(confirmPasswordInput).toHaveProp('secureTextEntry', true);

      // Toggle visibility for new password
      fireEvent.press(newPasswordVisibilityIcon);
      expect(passwordInput).toHaveProp('secureTextEntry', false);

      // Toggle visibility for confirm password
      fireEvent.press(confirmPasswordVisibilityIcon);
      expect(confirmPasswordInput).toHaveProp('secureTextEntry', false);
    });

    it('shows Done keyboard action on confirm password field', async () => {
      const { getByTestId } = await renderCreatePasswordUI();

      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      expect(confirmPasswordInput).toHaveProp('returnKeyType', 'done');
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
      expect(confirmPasswordInput).toHaveProp('editable', false);

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      fireEvent.changeText(passwordInput, 'StrongPass123!');

      await waitFor(() => {
        expect(confirmPasswordInput).toHaveProp('editable', true);
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

    it('shows error state only after password field loses focus with invalid password', async () => {
      const { getByText, getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      // Enter a short password
      await act(async () => {
        fireEvent.changeText(passwordInput, 'short');
      });

      // Helper text should still be visible
      await waitFor(() => {
        expect(
          getByText(
            strings('choose_password.must_be_at_least', {
              number: MIN_PASSWORD_LENGTH,
            }),
          ),
        ).toBeOnTheScreen();
      });

      // Blur the password field
      await act(async () => {
        fireEvent(passwordInput, 'blur');
      });

      // Helper text should still be visible after blur
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

    it('hides error state when user focuses back on password field', async () => {
      const { getByText, getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );

      // Enter a short password and blur to trigger error state
      await act(async () => {
        fireEvent.changeText(passwordInput, 'short');
        fireEvent(passwordInput, 'blur');
      });

      // Focus back on the password field
      await act(async () => {
        fireEvent(passwordInput, 'focus');
      });

      // Helper text should still be visible but error state should be reset
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
      expect(confirmPasswordInput).toHaveProp('editable', true);
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

    it('opens the password warning bottom sheet when the CTA is pressed', async () => {
      const { getByText, getByTestId } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(passwordInput, 'StrongPass123!');
        fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');
      });

      await act(async () => {
        fireEvent.press(
          getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
        );
      });

      await waitFor(() => {
        expect(
          getByText(strings('import_from_seed.password_warning_title')),
        ).toBeOnTheScreen();
        expect(
          getByText(strings('import_from_seed.i_understand')),
        ).toBeOnTheScreen();
      });
    });

    it('error message is shown when passcode is not set', async () => {
      const { getByTestId, getByText } = await renderCreatePasswordUI();

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

      // Mock Authentication.newWalletAndRestore to throw passcode error
      jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockRejectedValueOnce(new Error('Error: Passcode not set.'));

      // Try to import through the warning sheet
      await confirmImportFromWarning(getByTestId, getByText);
    });

    it('Import seed phrase with optin metrics flow', async () => {
      mockIsEnabled.mockReturnValue(false);
      const { getByTestId, getByText } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      // Enter valid passwords
      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });

      // Mock Authentication.newWalletAndRestore
      jest.spyOn(Authentication, 'newWalletAndRestore').mockResolvedValueOnce();

      // Try to import through the warning sheet
      await confirmImportFromWarning(getByTestId, getByText);
    });

    it('reports to Sentry when wallet import fails with metrics enabled', async () => {
      mockIsEnabled.mockReturnValue(true);
      mockCaptureException.mockClear();

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });

      const importError = new Error('Wallet import failed');
      jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockRejectedValueOnce(importError);

      const { getByTestId, getByText } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      await confirmImportFromWarning(getByTestId, getByText);

      await waitFor(() => {
        expect(mockCaptureException).toHaveBeenCalledWith(importError, {
          tags: {
            view: 'ImportFromSecretRecoveryPhrase',
            context: 'Wallet import failed - auto reported',
          },
        });
      });
    });

    it('does not report to Sentry when wallet import fails with metrics disabled', async () => {
      mockIsEnabled.mockReturnValue(false);
      mockCaptureException.mockClear();

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });

      const importError = new Error('Wallet import failed');
      jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockRejectedValueOnce(importError);

      const { getByTestId, getByText } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      await confirmImportFromWarning(getByTestId, getByText);

      await waitFor(() => {
        expect(mockCaptureException).not.toHaveBeenCalled();
      });
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

      const { getByTestId, getByRole, unmount } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
        { onboardingTraceCtx: mockOnboardingTraceCtx },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(input, VALID_SEED_PHRASE);
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
      const { getByTestId, getByRole, unmount } = renderScreen(
        ImportFromSecretRecoveryPhrase,
        { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
        { state: initialState },
      );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );
      await act(async () => {
        fireEvent.changeText(input, VALID_SEED_PHRASE);
      });

      const continueButton = getByRole('button', { name: 'Continue' });
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockTrace).not.toHaveBeenCalled();

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('traces error and reports to Sentry when wallet import fails with onboardingTraceCtx', async () => {
      mockIsEnabled.mockReturnValue(true);
      mockCaptureException.mockClear();
      const mockOnboardingTraceCtx = { traceId: 'test-trace-id' };
      const testError = new Error('Authentication failed');

      // Mock failing authentication to trigger outer catch block
      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);

      const { getByTestId, getByText } = await renderCreatePasswordUI(
        mockOnboardingTraceCtx,
      );

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      await confirmImportFromWarning(getByTestId, getByText);

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

          expect(mockCaptureException).toHaveBeenCalledWith(testError, {
            tags: {
              view: 'ImportFromSecretRecoveryPhrase',
              context: 'Wallet import failed - auto reported',
            },
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

      const { getByTestId, getByText } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      await confirmImportFromWarning(getByTestId, getByText);

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

    it('does not report to Sentry when wallet import fails with metrics disabled', async () => {
      mockIsEnabled.mockReturnValue(false);
      mockCaptureException.mockClear();
      const testError = new Error('Authentication failed');

      const mockComponentAuthenticationType = jest.spyOn(
        Authentication,
        'componentAuthenticationType',
      );
      mockComponentAuthenticationType.mockRejectedValueOnce(testError);

      const { getByTestId, getByText } = await renderCreatePasswordUI();

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      await confirmImportFromWarning(getByTestId, getByText);

      await waitFor(() => {
        expect(mockCaptureException).not.toHaveBeenCalled();
      });

      mockIsEnabled.mockReturnValue(true);
    });
  });

  describe('SRP TextArea input', () => {
    it('renders the seed phrase text area', () => {
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

    it('updates the seed phrase value on change', async () => {
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

      expect(srpInput.props.value).toBe('ab');
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

  describe('account_type analytics', () => {
    const renderCreatePasswordUIWithParams = async (
      params: Record<string, unknown> = {},
    ) => {
      const { getByText, getByPlaceholderText, getByRole, getByTestId } =
        renderScreen(
          ImportFromSecretRecoveryPhrase,
          { name: Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE },
          { state: initialState },
          params,
        );

      const input = getByTestId(
        ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID,
      );

      await act(async () => {
        fireEvent.changeText(input, VALID_SEED_PHRASE);
      });

      const continueButton = getByRole('button', { name: 'Continue' });
      fireEvent.press(continueButton);

      return { getByText, getByPlaceholderText, getByRole, getByTestId };
    };

    it('uses SrpImport account_type on trace when oauthLoginSuccess is false', async () => {
      const mockTrace = trace as jest.MockedFunction<typeof trace>;
      mockTrace.mockClear();

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });
      jest.spyOn(Authentication, 'newWalletAndRestore').mockResolvedValueOnce();

      const { getByTestId, getByText } = await renderCreatePasswordUIWithParams(
        {
          oauthLoginSuccess: false,
        },
      );

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      await confirmImportFromWarning(getByTestId, getByText);

      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingSRPAccountImportTime,
            tags: expect.objectContaining({
              account_type: 'srp_import',
              is_social_login: false,
            }),
          }),
        );
      });
    });

    it('uses SocialImport account_type on trace when oauthLoginSuccess is true', async () => {
      const mockTrace = trace as jest.MockedFunction<typeof trace>;
      mockTrace.mockClear();

      jest
        .spyOn(Authentication, 'componentAuthenticationType')
        .mockResolvedValueOnce({
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
          availableBiometryType: BIOMETRY_TYPE.FACE_ID,
        });
      jest.spyOn(Authentication, 'newWalletAndRestore').mockResolvedValueOnce();

      const { getByTestId, getByText } = await renderCreatePasswordUIWithParams(
        {
          oauthLoginSuccess: true,
        },
      );

      const passwordInput = getByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = getByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, 'StrongPass123!');
      fireEvent.changeText(confirmPasswordInput, 'StrongPass123!');

      await confirmImportFromWarning(getByTestId, getByText);

      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith(
          expect.objectContaining({
            name: TraceName.OnboardingSRPAccountImportTime,
            tags: expect.objectContaining({
              account_type: 'social_import',
              is_social_login: true,
            }),
          }),
        );
      });
    });
  });
});
