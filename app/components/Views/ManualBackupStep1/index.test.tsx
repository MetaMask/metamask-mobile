import React from 'react';
import ManualBackupStep1 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { ManualBackUpStepsSelectorsIDs } from './ManualBackUpSteps.testIds';
import { AppThemeKey } from '../../../util/theme/models';
import { strings } from '../../../../locales/i18n';
import { InteractionManager, Platform } from 'react-native';
import { AccountType } from '../../../constants/onboarding';

const mockStore = configureMockStore();
const store = mockStore({ user: { appTheme: AppThemeKey.light } });

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((cb) => cb()),
    },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = (...args: unknown[]) => ({
      fontSize: 14,
      lineHeight: 20,
      ...(typeof args[0] === 'string' ? { testStyle: args[0] } : {}),
    });
    tw.style = (...args: unknown[]) => args;
    return tw;
  },
  useTheme: () => 'light',
  Theme: { Light: 'light', Dark: 'dark' },
}));

const mockUseTheme = jest.fn().mockReturnValue({
  colors: {
    text: { default: '#000000' },
    background: { default: '#FFFFFF', muted: '#F2F4F6' },
    icon: { default: '#24272A' },
    border: { default: '#BBC0C5', muted: '#D6D9DC' },
    error: { default: '#D73A49' },
  },
  themeAppearance: 'dark',
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
  AppThemeKey: { os: 'os', light: 'light', dark: 'dark' },
}));

const mockIsMetricsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    isEnabled: mockIsMetricsEnabled,
    enable: jest.fn(),
    addTraitsToUser: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: jest.fn() })),
      build: jest.fn(),
    })),
    trackEvent: jest.fn(),
    getAnalyticsId: jest.fn(),
  }),
}));

jest.mock('../../../core/Engine', () => {
  const mockHasFundsFn = jest.fn().mockReturnValue(true);
  const mockExportSeedPhraseFn = jest.fn().mockResolvedValue(new Uint8Array());
  return {
    __esModule: true,
    default: {
      hasFunds: mockHasFundsFn,
      context: {
        KeyringController: { exportSeedPhrase: mockExportSeedPhraseFn },
      },
    },
  };
});

const Engine = jest.requireMock('../../../core/Engine').default;
const mockHasFunds = Engine.hasFunds as jest.Mock;
const mockExportSeedPhrase = Engine.context.KeyringController
  .exportSeedPhrase as jest.Mock;

const mockGetPassword = jest.fn();
jest.mock('../../../core', () => ({
  Authentication: { getPassword: () => mockGetPassword() },
}));

jest.mock('../../../util/Logger', () => ({ error: jest.fn(), log: jest.fn() }));
const Logger = jest.requireMock('../../../util/Logger');

const MOCK_WORDS = [
  'abstract',
  'accident',
  'acoustic',
  'announce',
  'artefact',
  'attitude',
  'bachelor',
  'broccoli',
  'business',
  'category',
  'champion',
  'cinnamon',
];

const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  isFocused: jest.fn(),
});

interface SetupOptions {
  seedPhrase?: string[];
  words?: string[];
  backupFlow?: boolean;
  settingsBackup?: boolean;
}

const renderComponent = (routeParams: SetupOptions = {}) => {
  const nav = createMockNavigation();
  store.dispatch = nav.dispatch;

  (useNavigation as jest.Mock).mockReturnValue(nav);
  (useRoute as jest.Mock).mockReturnValue({
    params: {
      seedPhrase: MOCK_WORDS,
      backupFlow: true,
      settingsBackup: true,
      ...routeParams,
    },
  });

  const wrapper = renderWithProvider(
    <Provider store={store}>
      <ManualBackupStep1 />
    </Provider>,
  );

  return { wrapper, ...nav };
};

const revealSeedPhrase = async (
  wrapper: ReturnType<typeof renderWithProvider>,
) => {
  fireEvent.press(
    wrapper.getByTestId(ManualBackUpStepsSelectorsIDs.BLUR_BUTTON),
  );
  await waitFor(() => {
    expect(
      wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
    ).toBeOnTheScreen();
  });
};

const renderPasswordView = async () => {
  mockGetPassword.mockResolvedValue(null);

  const result = renderComponent({
    seedPhrase: undefined,
    words: undefined,
    backupFlow: false,
    settingsBackup: false,
  });

  await waitFor(() => {
    expect(
      result.wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT,
      ),
    ).toBeOnTheScreen();
  });

  return result;
};

describe('ManualBackupStep1', () => {
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(
    jest.fn().mockImplementation((cb) => {
      cb();
      return {
        then: (f: () => void) => Promise.resolve(f()),
        done: (f: () => void, r: () => void) => Promise.resolve().then(f, r),
        cancel: jest.fn(),
      };
    }),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { wrapper } = renderComponent();
    expect(wrapper).toMatchSnapshot();
  });

  describe('seed phrase reveal', () => {
    it('reveals seed phrase words after pressing the blur overlay', async () => {
      const { wrapper } = renderComponent();

      expect(
        wrapper.getByText(strings('manual_backup_step_1.action')),
      ).toBeOnTheScreen();
      expect(
        wrapper.getByText(strings('manual_backup_step_1.reveal')),
      ).toBeOnTheScreen();

      await revealSeedPhrase(wrapper);
    }, 15000);

    it('displays the concealer with blur overlay before reveal', () => {
      const { wrapper } = renderComponent();

      expect(
        wrapper.getByText(strings('manual_backup_step_1.action')),
      ).toBeOnTheScreen();
      expect(
        wrapper.getByText(strings('manual_backup_step_1.reveal')),
      ).toBeOnTheScreen();
    });

    it('opens the seedphrase definition modal', async () => {
      const { wrapper, navigate } = renderComponent();

      const srpText = wrapper.getByText(strings('manual_backup_step_1.info-2'));
      fireEvent.press(srpText);

      expect(navigate).toHaveBeenCalledWith('RootModalFlow', {
        screen: 'SeedphraseModal',
      });
    });

    it('navigates to ManualBackupStep2 after reveal and continue', async () => {
      const { wrapper, navigate } = renderComponent();

      await revealSeedPhrase(wrapper);

      fireEvent.press(
        wrapper.getByText(strings('manual_backup_step_1.continue')),
      );

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('ManualBackupStep2', {
          words: MOCK_WORDS,
          steps: [
            'Create password',
            'Secure wallet',
            'Confirm Secret Recovery Phrase',
          ],
          backupFlow: true,
          settingsBackup: true,
        });
      });
    });
  });

  describe('header visibility', () => {
    it('hides header during onboarding flow', () => {
      const { setOptions } = renderComponent({
        backupFlow: false,
        settingsBackup: false,
      });

      expect(setOptions).toHaveBeenCalled();
      expect(setOptions.mock.calls[0][0].headerShown).toBe(false);
    });

    it('shows header with back button for backup flow', () => {
      const { setOptions } = renderComponent({
        backupFlow: true,
        settingsBackup: false,
      });

      expect(setOptions).toHaveBeenCalled();
      const opts = setOptions.mock.calls[0][0];
      expect(opts.headerShown).toBeUndefined();
      expect(opts.headerLeft).toBeDefined();
      expect(opts.headerTitle).toBeNull();
    });

    it('shows header with back button for settings backup flow', () => {
      const { setOptions } = renderComponent({
        backupFlow: false,
        settingsBackup: true,
      });

      expect(setOptions).toHaveBeenCalled();
      const opts = setOptions.mock.calls[0][0];
      expect(opts.headerShown).toBeUndefined();
      expect(opts.headerLeft).toBeDefined();
      expect(opts.headerTitle).toBeNull();
    });
  });

  describe('theme appearance', () => {
    afterEach(() => {
      mockUseTheme.mockReturnValue({
        colors: {
          text: { default: '#000000' },
          background: { default: '#FFFFFF', muted: '#F2F4F6' },
          icon: { default: '#24272A' },
          border: { default: '#BBC0C5', muted: '#D6D9DC' },
          error: { default: '#D73A49' },
        },
        themeAppearance: 'dark',
      });
      Platform.OS = 'ios';
    });

    it('renders with dark theme', () => {
      const { wrapper } = renderComponent();
      expect(wrapper).toMatchSnapshot();
    });

    it('renders with light theme on Android', () => {
      Platform.OS = 'android';
      mockUseTheme.mockReturnValue({
        colors: {
          text: { default: '#000000' },
          background: { default: '#FFFFFF', muted: '#F2F4F6' },
          icon: { default: '#24272A' },
          border: { default: '#BBC0C5', muted: '#D6D9DC' },
          error: { default: '#D73A49' },
        },
        themeAppearance: 'light',
      });

      const { wrapper } = renderComponent();
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('remind me later', () => {
    const renderOnboarding = (overrides: SetupOptions = {}) =>
      renderComponent({
        backupFlow: false,
        settingsBackup: false,
        ...overrides,
      });

    it('is hidden when user has funds', () => {
      mockHasFunds.mockReturnValue(true);
      const { wrapper } = renderOnboarding();

      expect(
        wrapper.queryByText(strings('account_backup_step_1.remind_me_later')),
      ).toBeNull();
    });

    it('is visible when user has no funds', () => {
      mockHasFunds.mockReturnValue(false);
      const { wrapper } = renderOnboarding();

      expect(
        wrapper.queryByText(strings('account_backup_step_1.remind_me_later')),
      ).toBeOnTheScreen();
    });

    it('is hidden for backup flow', () => {
      mockHasFunds.mockReturnValue(false);
      const { wrapper } = renderOnboarding({ backupFlow: true });

      expect(
        wrapper.queryByText(strings('account_backup_step_1.remind_me_later')),
      ).toBeNull();
    });

    it('is hidden for settings backup flow', () => {
      mockHasFunds.mockReturnValue(false);
      const { wrapper } = renderOnboarding({ settingsBackup: true });

      expect(
        wrapper.queryByText(strings('account_backup_step_1.remind_me_later')),
      ).toBeNull();
    });

    it('skips backup and resets navigation when metrics are enabled', async () => {
      mockHasFunds.mockReturnValue(false);
      mockIsMetricsEnabled.mockReturnValue(true);
      const { wrapper, dispatch } = renderOnboarding();

      await act(async () => {
        fireEvent.press(
          wrapper.getByText(strings('account_backup_step_1.remind_me_later')),
        );
      });

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RESET',
          payload: expect.objectContaining({
            index: 0,
            routes: expect.arrayContaining([
              expect.objectContaining({ name: 'OnboardingSuccessFlow' }),
            ]),
          }),
        }),
      );
    });

    it('navigates to OptinMetrics when metrics are disabled', async () => {
      mockHasFunds.mockReturnValue(false);
      mockIsMetricsEnabled.mockReturnValue(false);
      const { wrapper, navigate } = renderOnboarding();

      await act(async () => {
        fireEvent.press(
          wrapper.getByText(strings('account_backup_step_1.remind_me_later')),
        );
      });

      expect(navigate).toHaveBeenCalledWith(
        'OptinMetrics',
        expect.objectContaining({
          onContinue: expect.any(Function),
          accountType: AccountType.Metamask,
        }),
      );
    });

    it('navigates to ManualBackupStep2 after revealing and pressing continue', async () => {
      mockHasFunds.mockReturnValue(false);
      const { wrapper, navigate } = renderOnboarding();

      await revealSeedPhrase(wrapper);

      fireEvent.press(
        wrapper.getByTestId(ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON),
      );

      expect(navigate).toHaveBeenCalledWith('ManualBackupStep2', {
        words: MOCK_WORDS,
        steps: expect.any(Array),
        backupFlow: false,
        settingsBackup: false,
      });
    });
  });

  describe('seed phrase recovery (no seed phrase in route params)', () => {
    it('shows password view when Authentication.getPassword returns null', async () => {
      const { wrapper } = await renderPasswordView();

      expect(
        wrapper.getByText(strings('manual_backup_step_1.before_continiuing')),
      ).toBeOnTheScreen();
    });

    it('shows password view and logs error when getPassword throws', async () => {
      mockGetPassword.mockRejectedValue(new Error('Test error'));

      const { wrapper } = renderComponent({
        seedPhrase: undefined,
        words: undefined,
        backupFlow: false,
        settingsBackup: false,
      });

      await waitFor(() => {
        expect(
          wrapper.getByTestId(
            ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT,
          ),
        ).toBeOnTheScreen();
      });

      expect(Logger.error).toHaveBeenCalled();
    });

    it('exports seed phrase when credentials are available', async () => {
      mockGetPassword.mockResolvedValue({ password: 'test-password' });
      mockExportSeedPhrase.mockResolvedValue(new Uint8Array([0]));

      renderComponent({
        seedPhrase: undefined,
        words: [],
        backupFlow: false,
        settingsBackup: false,
      });

      await waitFor(() => {
        expect(mockGetPassword).toHaveBeenCalled();
      });
    });
  });

  describe('password unlock', () => {
    it('unlocks with correct password', async () => {
      const { wrapper } = await renderPasswordView();
      mockExportSeedPhrase.mockResolvedValue(new Uint8Array([0]));

      await act(async () => {
        fireEvent.changeText(
          wrapper.getByTestId(
            ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT,
          ),
          'correct-password',
        );
      });

      await act(async () => {
        fireEvent.press(
          wrapper.getByTestId(ManualBackUpStepsSelectorsIDs.SUBMIT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(mockExportSeedPhrase).toHaveBeenCalledWith('correct-password');
      });
    });

    it('shows incorrect password warning on decrypt failure', async () => {
      const { wrapper } = await renderPasswordView();
      mockExportSeedPhrase.mockRejectedValue(new Error('Decrypt failed'));

      await act(async () => {
        fireEvent.changeText(
          wrapper.getByTestId(
            ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT,
          ),
          'wrong-password',
        );
      });

      await act(async () => {
        fireEvent.press(
          wrapper.getByTestId(ManualBackUpStepsSelectorsIDs.SUBMIT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          wrapper.getByText(
            strings('reveal_credential.warning_incorrect_password'),
          ),
        ).toBeOnTheScreen();
      });
    });

    it('shows unknown error for non-decrypt failures', async () => {
      const { wrapper } = await renderPasswordView();
      mockExportSeedPhrase.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        fireEvent.changeText(
          wrapper.getByTestId(
            ManualBackUpStepsSelectorsIDs.CONFIRM_PASSWORD_INPUT,
          ),
          'some-password',
        );
      });

      await act(async () => {
        fireEvent.press(
          wrapper.getByTestId(ManualBackUpStepsSelectorsIDs.SUBMIT_BUTTON),
        );
      });

      await waitFor(() => {
        expect(
          wrapper.getByText(strings('reveal_credential.unknown_error')),
        ).toBeOnTheScreen();
      });
    });

    it('does not attempt unlock when password is empty', async () => {
      const { wrapper } = await renderPasswordView();
      mockExportSeedPhrase.mockClear();

      await act(async () => {
        fireEvent.press(
          wrapper.getByTestId(ManualBackUpStepsSelectorsIDs.SUBMIT_BUTTON),
        );
      });

      expect(mockExportSeedPhrase).not.toHaveBeenCalled();
    });
  });
});
