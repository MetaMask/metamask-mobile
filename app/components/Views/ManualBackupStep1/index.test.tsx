import React from 'react';
import ManualBackupStep1 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import { AppThemeKey } from '../../../util/theme/models';
import { strings } from '../../../../locales/i18n';
import { InteractionManager, Platform } from 'react-native';

const mockStore = configureMockStore();
const initialState = {
  user: { appTheme: AppThemeKey.light },
};
const store = mockStore(initialState);

const initialStateDark = {
  user: { appTheme: AppThemeKey.dark },
};
const storeDark = mockStore(initialStateDark);

const initialStateOs = {
  user: { appTheme: AppThemeKey.os },
};
const storeOs = mockStore(initialStateOs);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        default: '#000000',
      },
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((cb) => cb()),
    },
  };
});

// Mock useTheme hook - default to dark theme
const mockUseTheme = jest.fn().mockReturnValue({
  colors: {},
  themeAppearance: 'dark', // Default to dark theme
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
  AppThemeKey: {
    os: 'os',
    light: 'light',
    dark: 'dark',
  },
}));

// Mock useMetrics hook
const mockIsMetricsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    isEnabled: mockIsMetricsEnabled,
    enable: jest.fn(),
    addTraitsToUser: jest.fn(),
    createEventBuilder: jest.fn(),
    trackEvent: jest.fn(),
    trackAnonymousEvent: jest.fn(),
    getMetaMetricsId: jest.fn(),
  }),
}));

// Mock Engine
jest.mock('../../../core/Engine', () => {
  const mockHasFundsFn = jest.fn().mockReturnValue(true);
  const mockExportSeedPhraseFn = jest.fn().mockResolvedValue(new Uint8Array());

  return {
    __esModule: true,
    default: {
      hasFunds: mockHasFundsFn,
      context: {
        KeyringController: {
          exportSeedPhrase: mockExportSeedPhraseFn,
        },
      },
    },
  };
});

const Engine = jest.requireMock('../../../core/Engine').default;
const mockHasFunds = Engine.hasFunds as jest.Mock;

describe('ManualBackupStep1', () => {
  const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
    cb();
    return {
      then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
      done: (onfulfilled: () => void, onrejected: () => void) =>
        Promise.resolve().then(onfulfilled, onrejected),
      cancel: jest.fn(),
    };
  });
  jest
    .spyOn(InteractionManager, 'runAfterInteractions')
    .mockImplementation(mockRunAfterInteractions);

  const mockWords = [
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

  const mockRoute = {
    params: {
      words: mockWords,
      backupFlow: true,
      settingsBackup: true,
      seedPhrase: mockWords,
    },
  };

  const setupTest = (routeParams = {}) => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();
    const mockDispatch = jest.fn();

    store.dispatch = mockDispatch;

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
    });

    const testRoute = {
      params: {
        ...mockRoute.params,
        ...routeParams,
      },
    };

    const wrapper = renderWithProvider(
      <Provider store={store}>
        <ManualBackupStep1
          route={testRoute}
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            isFocused: jest.fn(),
          }}
        />
      </Provider>,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockDispatch,
    };
  };

  const setupTestDark = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();
    const mockDispatch = jest.fn();

    storeDark.dispatch = mockDispatch;

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <Provider store={storeDark}>
        <ManualBackupStep1
          route={mockRoute}
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            isFocused: jest.fn(),
          }}
        />
      </Provider>,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockDispatch,
    };
  };

  const setupTestOs = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();
    const mockDispatch = jest.fn();

    storeOs.dispatch = mockDispatch;

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <Provider store={storeOs}>
        <ManualBackupStep1
          route={mockRoute}
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            isFocused: jest.fn(),
          }}
        />
      </Provider>,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockDispatch,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { wrapper } = setupTest();
    expect(wrapper).toMatchSnapshot();
  });

  it('render Step 2 of 3 i.e Reveal SeedPhrase with light theme', async () => {
    const { wrapper } = setupTest();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });
  });

  it('render Step 2 of 3 i.e Reveal SeedPhrase with dark theme', async () => {
    const { wrapper } = setupTestDark();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });
  });

  it('render Step 2 of 3 i.e Reveal SeedPhrase with os theme', async () => {
    const { wrapper, mockNavigate } = setupTestOs();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });

    const srpText = wrapper.getByText(strings('manual_backup_step_1.info-2'));

    fireEvent.press(srpText);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SeedphraseModal',
    });

    const confirmButton = wrapper.getByText(
      strings('manual_backup_step_1.continue'),
    );

    fireEvent.press(confirmButton);

    expect(confirmButton).toBeTruthy();
  });

  it('render Step 2 of 3 and after reveal seedPhrase navigate to Step 3 of 3 i.e. ManualBackupStep2', async () => {
    const { wrapper, mockNavigate } = setupTestOs();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });

    const confirmButton = wrapper.getByText(
      strings('manual_backup_step_1.continue'),
    );

    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ManualBackupStep2', {
        words: mockWords,
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

  it('render SeedPhrase reveal container', async () => {
    const { wrapper } = setupTest();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();
  });

  describe('Header visibility based on flow type', () => {
    it('hides header for onboarding flow', () => {
      const { mockSetOptions } = setupTest({
        backupFlow: false,
        settingsBackup: false,
      });

      expect(mockSetOptions).toHaveBeenCalled();
      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      expect(setOptionsCall.headerShown).toBe(false);
    });

    it('shows header with back button for backup flow', () => {
      const { mockSetOptions } = setupTest({
        backupFlow: true,
        settingsBackup: false,
      });

      expect(mockSetOptions).toHaveBeenCalled();
      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      expect(setOptionsCall.headerShown).toBeUndefined();
      expect(setOptionsCall.headerLeft).toBeDefined();
      expect(setOptionsCall.headerTitle).toBeNull();
    });

    it('shows header with back button for settings backup flow', () => {
      const { mockSetOptions } = setupTest({
        backupFlow: false,
        settingsBackup: true,
      });

      expect(mockSetOptions).toHaveBeenCalled();
      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      expect(setOptionsCall.headerShown).toBeUndefined();
      expect(setOptionsCall.headerLeft).toBeDefined();
      expect(setOptionsCall.headerTitle).toBeNull();
    });
  });

  describe('Theme appearance', () => {
    afterEach(() => {
      mockUseTheme.mockReturnValue({
        colors: {},
        themeAppearance: 'dark',
      });
      Platform.OS = 'ios';
    });

    it('renders dark SRP design image by default (dark theme)', () => {
      mockUseTheme.mockReturnValue({
        colors: {},
        themeAppearance: 'dark',
      });

      const { wrapper } = setupTest();

      expect(wrapper).toMatchSnapshot();
    });

    it('renders light SRP design image for light theme', () => {
      Platform.OS = 'android';
      mockUseTheme.mockReturnValue({
        colors: {},
        themeAppearance: 'light',
      });

      const { wrapper } = setupTest();

      expect(wrapper).toMatchSnapshot();
      Platform.OS = 'ios';
    });
  });

  describe('Remind me later functionality', () => {
    let mockNavigate: jest.Mock;
    let mockSetOptions: jest.Mock;
    let mockDispatch: jest.Mock;

    beforeEach(() => {
      mockNavigate = jest.fn();
      mockSetOptions = jest.fn();
      mockDispatch = jest.fn();
      jest.clearAllMocks();
    });

    const setupTestWithMocks = (routeParams = {}) => {
      (useNavigation as jest.Mock).mockReturnValue({
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        dispatch: mockDispatch,
        goBack: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      });

      const mockRoute = {
        params: {
          seedPhrase: mockWords,
          backupFlow: false,
          settingsBackup: false,
          ...routeParams,
        },
      };

      const wrapper = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep1
            route={mockRoute}
            navigation={{
              navigate: mockNavigate,
              setOptions: mockSetOptions,
              dispatch: mockDispatch,
              goBack: jest.fn(),
              addListener: jest.fn(),
              removeListener: jest.fn(),
            }}
          />
        </Provider>,
      );

      return { wrapper };
    };

    it('hides remind me later button when user has funds', () => {
      mockHasFunds.mockReturnValue(true);

      const { wrapper } = setupTestWithMocks();

      const reminderButton = wrapper.queryByText(
        strings('account_backup_step_1.remind_me_later'),
      );

      expect(reminderButton).toBeNull();
    });

    it('displays remind me later button when user has no funds', () => {
      mockHasFunds.mockReturnValue(false);

      const { wrapper } = setupTestWithMocks();

      const reminderButton = wrapper.queryByText(
        strings('account_backup_step_1.remind_me_later'),
      );

      expect(reminderButton).toBeOnTheScreen();
    });

    it('hides remind me later button for backup flow', () => {
      mockHasFunds.mockReturnValue(false);

      const { wrapper } = setupTestWithMocks({ backupFlow: true });

      const reminderButton = wrapper.queryByText(
        strings('account_backup_step_1.remind_me_later'),
      );

      expect(reminderButton).toBeNull();
    });

    it('hides remind me later button for settings backup flow', () => {
      mockHasFunds.mockReturnValue(false);

      const { wrapper } = setupTestWithMocks({ settingsBackup: true });

      const reminderButton = wrapper.queryByText(
        strings('account_backup_step_1.remind_me_later'),
      );

      expect(reminderButton).toBeNull();
    });

    it('directly executes skip when remind me later button is pressed with metrics enabled', async () => {
      mockHasFunds.mockReturnValue(false);
      mockIsMetricsEnabled.mockReturnValue(true);

      const { wrapper } = setupTestWithMocks();

      const reminderButton = wrapper.getByText(
        strings('account_backup_step_1.remind_me_later'),
      );

      await act(async () => {
        fireEvent.press(reminderButton);
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RESET',
          payload: expect.objectContaining({
            index: 0,
            routes: expect.arrayContaining([
              expect.objectContaining({
                name: 'OnboardingSuccessFlow',
              }),
            ]),
          }),
        }),
      );
    });

    it('navigates to OptinMetrics when remind me later is pressed with metrics disabled', async () => {
      mockHasFunds.mockReturnValue(false);
      mockIsMetricsEnabled.mockReturnValue(false);

      const { wrapper } = setupTestWithMocks();

      const reminderButton = wrapper.getByText(
        strings('account_backup_step_1.remind_me_later'),
      );

      await act(async () => {
        fireEvent.press(reminderButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'OptinMetrics',
        expect.objectContaining({
          onContinue: expect.any(Function),
        }),
      );
    });

    it('navigates to ManualBackupStep2 when continue is pressed after reveal', async () => {
      mockHasFunds.mockReturnValue(false);

      const { wrapper } = setupTestWithMocks();

      // First reveal the seed phrase
      const revealButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        const continueButton = wrapper.getByTestId(
          ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
        );
        expect(continueButton).toBeOnTheScreen();
      });

      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );

      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith('ManualBackupStep2', {
        words: mockWords,
        steps: expect.any(Array),
        backupFlow: false,
        settingsBackup: false,
      });
    });
  });
});
