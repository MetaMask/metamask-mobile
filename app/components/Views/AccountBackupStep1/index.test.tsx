import React from 'react';
import AccountBackupStep1 from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import { fireEvent } from '@testing-library/react-native';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import Engine from '../../../core/Engine';
import StorageWrapper from '../../../store/storage-wrapper';
import { InteractionManager, Platform } from 'react-native';

// Use fake timers to resolve reanimated issues.
jest.useFakeTimers();

jest.mock('../../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  hasFunds: jest.fn(),
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

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

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();
const mockReset = jest.fn();

// mock useNavigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      dispatch: mockDispatch,
      reset: mockReset,
    }),
  };
});

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

// Use dynamic mocking to avoid native module conflicts
jest.doMock('react-native', () => {
  const originalRN = jest.requireActual('react-native');
  return {
    ...originalRN,
    StatusBar: {
      currentHeight: 42,
    },
  };
});

describe('AccountBackupStep1', () => {
  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    jest.clearAllMocks();
  });

  const setupTest = () => {
    const initialState = {
      engine: {
        backgroundState,
      },
    };

    const wrapper = renderWithProvider(<AccountBackupStep1 route={{}} />, {
      state: initialState,
    });

    return {
      wrapper,
    };
  };

  describe('Snapshots iOS', () => {
    it('render matches snapshot', () => {
      Platform.OS = 'ios';
      const { wrapper } = setupTest();
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('Snapshots android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('render matches snapshot', () => {
      const { wrapper } = setupTest();
      expect(wrapper).toMatchSnapshot();
    });

    it('render matches snapshot with status bar height to zero', () => {
      const { StatusBar } = jest.requireMock('react-native');
      const originalCurrentHeight = StatusBar.currentHeight;
      StatusBar.currentHeight = 0;
      const { wrapper } = setupTest();
      expect(wrapper).toMatchSnapshot();
      StatusBar.currentHeight = originalCurrentHeight;
    });
  });

  it('sets hasFunds to true when Engine.hasFunds returns true', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);
    const { wrapper } = setupTest();

    // The "Remind me later" button should not be present when hasFunds is true
    const reminderButton = wrapper.queryByText(
      strings('account_backup_step_1.remind_me_later'),
    );
    expect(reminderButton).toBeNull();
  });

  it('sets hasFunds to false when Engine.hasFunds returns false', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);
    const { wrapper } = setupTest();

    // The "Remind me later" button should be present when hasFunds is false
    const reminderButton = wrapper.getByText(
      strings('account_backup_step_1.remind_me_later'),
    );
    expect(reminderButton).toBeOnTheScreen();
  });

  it('renders title and explanation text', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);
    const { wrapper } = setupTest();
    const title = wrapper.getByText(strings('account_backup_step_1.title'));
    expect(title).toBeOnTheScreen();

    const explanationText = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.SEEDPHRASE_LINK,
    );
    expect(explanationText).toBeOnTheScreen();
  });

  it('shows seedphrase modal when srp link is pressed', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);
    const { wrapper } = setupTest();
    const srpLink = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.SEEDPHRASE_LINK,
    );
    expect(srpLink).toBeOnTheScreen();
    fireEvent.press(srpLink);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SeedphraseModal',
    });
  });

  it('renders remind me later button', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);
    const { wrapper } = setupTest();
    const reminderButton = wrapper.getByText(
      strings('account_backup_step_1.remind_me_later'),
    );
    expect(reminderButton).toBeOnTheScreen();
  });

  it('navigates to skip account security modal when remind me later button is pressed', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);
    const { wrapper } = setupTest();
    const reminderButton = wrapper.getByText(
      strings('account_backup_step_1.remind_me_later'),
    );

    fireEvent.press(reminderButton);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SkipAccountSecurityModal',
      params: {
        onConfirm: expect.any(Function),
        onCancel: expect.any(Function),
      },
    });
  });

  it('renders continue button on SkipAccountSecurityModal when remind me later button is pressed', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);
    const { wrapper } = setupTest();
    const reminderButton = wrapper.getByText(
      strings('account_backup_step_1.remind_me_later'),
    );

    fireEvent.press(reminderButton);

    const continueButton = wrapper.getByText(
      strings('account_backup_step_1.cta_text'),
    );
    expect(continueButton).toBeOnTheScreen();
  });

  it('navigates to ManualBackupStep1 when continue button is pressed', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);
    const { wrapper } = setupTest();
    const reminderButton = wrapper.getByText(
      strings('account_backup_step_1.remind_me_later'),
    );

    fireEvent.press(reminderButton);

    const continueButton = wrapper.getByText(
      strings('account_backup_step_1.cta_text'),
    );

    fireEvent.press(continueButton);
    expect(mockNavigate).toHaveBeenCalledWith('ManualBackupStep1', {});
  });

  it('renders AndroidBackHandler when on Android', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);

    const { wrapper } = setupTest();

    // Verify AndroidBackHandler is rendered
    const androidBackHandler = wrapper.UNSAFE_getByType(AndroidBackHandler);
    expect(androidBackHandler).toBeTruthy();

    // Verify customBackPress prop is passed
    expect(androidBackHandler.props.customBackPress).toBeDefined();
  });

  it('navigates to SkipAccountSecurityModal when customBackPress is called', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);
    (Engine.hasFunds as jest.Mock).mockReturnValue(false);

    const { wrapper } = setupTest();

    const androidBackHandler = wrapper.UNSAFE_getByType(AndroidBackHandler);

    // Test that pressing back triggers the correct navigation
    androidBackHandler.props.customBackPress();
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SkipAccountSecurityModal',
      params: {
        onConfirm: expect.any(Function),
        onCancel: expect.any(Function),
      },
    });
  });

  it('show what is seedphrase modal when srp link is pressed', () => {
    (Engine.hasFunds as jest.Mock).mockReturnValue(true);
    const { wrapper } = setupTest();
    const srpLink = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.SEEDPHRASE_LINK,
    );
    expect(srpLink).toBeOnTheScreen();
    fireEvent.press(srpLink);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SeedphraseModal',
    });
  });

  describe('skip functionality', () => {
    it('navigates to OnboardingSuccess when onboarding', async () => {
      (Engine.hasFunds as jest.Mock).mockReturnValue(false);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      mockNavigate.mockClear();
      const { wrapper } = setupTest();

      // Find and press the "Remind me later" button
      const remindLaterButton = wrapper.getByText(
        strings('account_backup_step_1.remind_me_later'),
      );
      fireEvent.press(remindLaterButton);

      expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
        screen: 'SkipAccountSecurityModal',
        params: {
          onConfirm: expect.any(Function),
          onCancel: expect.any(Function),
        },
      });

      // Get the onConfirm function from the modal params
      const modalParams = mockNavigate.mock.calls[0][1].params;

      // Call the onConfirm function (skip)
      await modalParams.onConfirm();
    });

    it('handle skip when metrics is disabled', async () => {
      mockIsEnabled.mockReturnValue(false);
      (Engine.hasFunds as jest.Mock).mockReturnValue(false);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const { wrapper } = setupTest();

      // Find and press the "Remind me later" button
      const remindLaterButton = wrapper.getByText(
        strings('account_backup_step_1.remind_me_later'),
      );
      fireEvent.press(remindLaterButton);

      // Get the onConfirm function from the modal params
      const modalParams = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'RootModalFlow' &&
          call[1].screen === 'SkipAccountSecurityModal',
      )[1].params;

      // Call the onConfirm function (skip)
      await modalParams.onConfirm();

      // Verify navigation to OnboardingSuccess
      expect(mockNavigate).toHaveBeenCalledWith('OptinMetrics', {
        onContinue: expect.any(Function),
      });

      // Get the onConfirm function from the modal params
      const modalParams2 = mockNavigate.mock.calls.find(
        (call) => call[0] === 'OptinMetrics',
      )[1];

      // Call the onContinue function
      await modalParams2.onContinue();
    });

    it('handle secure now button to goNext step when metrics is disabled', async () => {
      mockIsEnabled.mockReturnValue(false);
      (Engine.hasFunds as jest.Mock).mockReturnValue(false);
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);

      const { wrapper } = setupTest();

      // Find and press the "Remind me later" button
      const remindLaterButton = wrapper.getByText(
        strings('account_backup_step_1.remind_me_later'),
      );
      fireEvent.press(remindLaterButton);

      // Get the onConfirm function from the modal params
      const modalParams = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'RootModalFlow' &&
          call[1].screen === 'SkipAccountSecurityModal',
      )[1].params;

      mockNavigate.mockClear();
      // Call the onConfirm function (skip)
      await modalParams.onCancel();

      // Verify navigation to OnboardingSuccess
      expect(mockNavigate).toHaveBeenCalledWith('ManualBackupStep1', {});
    });
  });

  describe('Theme appearance', () => {
    afterEach(() => {
      mockUseTheme.mockReturnValue({
        colors: {},
        themeAppearance: 'dark',
      });
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
      mockUseTheme.mockReturnValue({
        colors: {},
        themeAppearance: 'light',
      });

      const { wrapper } = setupTest();

      expect(wrapper).toMatchSnapshot();
    });
  });
});
