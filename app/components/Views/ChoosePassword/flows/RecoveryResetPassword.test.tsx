import React from 'react';
import {
  render,
  act,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../../constants/navigation';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { strings } from '../../../../../locales/i18n';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { ChoosePasswordSelectorsIDs } from '../ChoosePassword.testIds';
import { PasswordResetWarningSheetSelectorsIDs } from '../../shared/PasswordResetWarningSheet/PasswordResetWarningSheet.testIds';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import { Authentication } from '../../../../core';
import Engine from '../../../../core/Engine';
import OAuthLoginService from '../../../../core/OAuthService/OAuthService';
import { setDataCollectionForMarketing } from '../../../../actions/security';
import { passwordSet } from '../../../../actions/user';
import { RouteMessengerContext } from '../../../../contexts/route-messenger';
import { createMockRouteMessenger } from '../../../../util/test/mock-route-messenger';
import Logger from '../../../../util/Logger';
import ChoosePassword from '..';

jest.mock('../../../../util/metrics/TrackOnboarding/trackOnboarding');

jest.mock(
  '../../../../util/onboarding/hooks/useOnboardingLoadingStallTracker',
  () => ({
    useOnboardingLoadingStallTracker: jest.fn(),
  }),
);

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
  getTraceContext: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../UI/OnboardingFoxLoader/OnboardingFoxLoader');

const mockResetGlobalPassword = jest.fn();
jest.mock('../../../../core/MfaRecovery/engineBindings', () => ({
  createPasswordlessRecoveryService: () => ({
    resetGlobalPassword: mockResetGlobalPassword,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    SeedlessOnboardingController: {
      fetchAllSecretData: jest.fn(),
    },
  },
}));

jest.mock('../../../../core/Authentication', () => ({
  unlockWithRecoveredSecrets: jest.fn(),
}));

jest.mock('../../../../core/OAuthService/OAuthService', () => ({
  updateMarketingOptInStatus: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => {
  const alert = {
    alert: jest.fn(),
  };
  return { __esModule: true, default: alert, ...alert };
});

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
};

const mockRoute = {
  params: {
    [PREVIOUS_SCREEN]: ONBOARDING,
    oauthLoginSuccess: true,
    provider: 'google',
    passwordlessSocialRecovery: true,
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

const mockFetchAllSecretData = Engine.context.SeedlessOnboardingController
  .fetchAllSecretData as jest.Mock;
const mockUnlockWithRecoveredSecrets =
  Authentication.unlockWithRecoveredSecrets as jest.Mock;
const mockUpdateMarketingOptInStatus =
  OAuthLoginService.updateMarketingOptInStatus as jest.Mock;
const mockRefreshGeolocation = jest.fn().mockResolvedValue('US');

const NEW_PASSWORD = 'Test123456!';
const MOCK_SECRETS = [{ data: new Uint8Array([1, 2, 3]), type: 'mnemonic' }];

const mockStore = configureMockStore();
const createStore = (geolocationLocation: string) =>
  mockStore({
    engine: {
      backgroundState: {
        ...backgroundState,
        GeolocationController: {
          location: geolocationLocation,
          status: 'loaded',
        },
      },
    },
    onboarding: { events: [] },
  });

let store = createStore('US');

const renderScreen = () =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <RouteMessengerContext.Provider
          value={createMockRouteMessenger({
            'GeolocationController:refreshGeolocation': mockRefreshGeolocation,
          })}
        >
          <ChoosePassword />
        </RouteMessengerContext.Provider>
      </ThemeContext.Provider>
    </Provider>,
  );

const fillForm = async () => {
  await act(async () => {
    fireEvent.changeText(
      screen.getByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
      NEW_PASSWORD,
    );
  });
  await act(async () => {
    fireEvent.changeText(
      screen.getByTestId(ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID),
      NEW_PASSWORD,
    );
  });
};

const submit = async () => {
  await act(async () => {
    fireEvent.press(
      screen.getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
    );
  });
};

const runBeforeNavigate = () => {
  mockUnlockWithRecoveredSecrets.mockImplementation(
    async (
      _password: string,
      _secrets: unknown,
      { onBeforeNavigate }: { onBeforeNavigate?: () => Promise<void> },
    ) => {
      await onBeforeNavigate?.();
    },
  );
};

describe('ChoosePassword — passwordless recovery reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store = createStore('US');
    mockResetGlobalPassword.mockResolvedValue(undefined);
    mockFetchAllSecretData.mockResolvedValue(MOCK_SECRETS);
    mockUnlockWithRecoveredSecrets.mockResolvedValue(undefined);
    mockUpdateMarketingOptInStatus.mockResolvedValue(undefined);
  });

  it('shows the marketing opt-in checked by default for USA users', () => {
    renderScreen();

    const optIn = screen.getByTestId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
    expect(optIn).toBeOnTheScreen();
    expect(optIn.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it('shows the marketing opt-in unchecked by default outside the USA', () => {
    store = createStore('GB');
    renderScreen();

    expect(
      screen.getByTestId(ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID)
        .props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: false }));
  });

  it('resets the password without showing the warning sheet', async () => {
    renderScreen();
    await fillForm();
    await submit();

    await waitFor(() =>
      expect(mockUnlockWithRecoveredSecrets).toHaveBeenCalled(),
    );
    expect(
      screen.queryByTestId(
        PasswordResetWarningSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    ).toBeNull();
  });

  it('resets the global password, fetches secrets once, then unlocks with them', async () => {
    const calls: string[] = [];
    mockResetGlobalPassword.mockImplementation(async () => {
      calls.push('resetGlobalPassword');
    });
    mockFetchAllSecretData.mockImplementation(async () => {
      calls.push('fetchAllSecretData');
      return MOCK_SECRETS;
    });
    mockUnlockWithRecoveredSecrets.mockImplementation(async () => {
      calls.push('unlockWithRecoveredSecrets');
    });
    renderScreen();
    await fillForm();
    await submit();

    await waitFor(() =>
      expect(mockUnlockWithRecoveredSecrets).toHaveBeenCalledTimes(1),
    );
    expect(calls).toEqual([
      'resetGlobalPassword',
      'fetchAllSecretData',
      'unlockWithRecoveredSecrets',
    ]);
    expect(mockResetGlobalPassword).toHaveBeenCalledWith(NEW_PASSWORD);
    expect(mockFetchAllSecretData).toHaveBeenCalledTimes(1);
    expect(mockFetchAllSecretData).toHaveBeenCalledWith(NEW_PASSWORD);
    expect(mockUnlockWithRecoveredSecrets).toHaveBeenCalledWith(
      NEW_PASSWORD,
      MOCK_SECRETS,
      expect.objectContaining({ authType: AUTHENTICATION_TYPE.PASSWORD }),
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('applies the default marketing opt-in after a successful unlock', async () => {
    runBeforeNavigate();
    renderScreen();
    await fillForm();
    await submit();

    await waitFor(() =>
      expect(mockUpdateMarketingOptInStatus).toHaveBeenCalledWith(true),
    );
    expect(store.getActions()).toContainEqual(
      setDataCollectionForMarketing(true),
    );
    expect(store.getActions()).toContainEqual(passwordSet());
  });

  it('applies the opt-in value the user chose', async () => {
    runBeforeNavigate();
    renderScreen();
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID),
      );
    });
    await fillForm();
    await submit();

    await waitFor(() =>
      expect(mockUpdateMarketingOptInStatus).toHaveBeenCalledWith(false),
    );
    expect(store.getActions()).toContainEqual(
      setDataCollectionForMarketing(false),
    );
  });

  it.each([
    {
      step: 'resetGlobalPassword',
      loggedStep: 'reset_global_password',
      fail: () => mockResetGlobalPassword.mockRejectedValue(new Error('x')),
      expectedFetches: 0,
      expectedUnlocks: 0,
    },
    {
      step: 'fetchAllSecretData',
      loggedStep: 'fetch_secrets',
      fail: () => mockFetchAllSecretData.mockRejectedValue(new Error('x')),
      expectedFetches: 1,
      expectedUnlocks: 0,
    },
    {
      step: 'unlockWithRecoveredSecrets',
      loggedStep: 'unlock_wallet',
      fail: () =>
        mockUnlockWithRecoveredSecrets.mockRejectedValue(new Error('x')),
      expectedFetches: 1,
      expectedUnlocks: 1,
    },
  ])(
    'shows the recovery alert and stops when $step fails',
    async ({ loggedStep, fail, expectedFetches, expectedUnlocks }) => {
      fail();
      renderScreen();
      await fillForm();
      await submit();

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          strings('wallet_recovery_mfa.recovery_failed'),
          undefined,
        ),
      );
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        `ChoosePassword: passwordless social recovery failed at ${loggedStep}`,
      );
      expect(mockFetchAllSecretData).toHaveBeenCalledTimes(expectedFetches);
      expect(mockUnlockWithRecoveredSecrets).toHaveBeenCalledTimes(
        expectedUnlocks,
      );
      expect(mockUpdateMarketingOptInStatus).not.toHaveBeenCalled();
      expect(store.getActions()).not.toContainEqual(
        setDataCollectionForMarketing(true),
      );
      expect(
        screen.getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeOnTheScreen();
    },
  );
});
