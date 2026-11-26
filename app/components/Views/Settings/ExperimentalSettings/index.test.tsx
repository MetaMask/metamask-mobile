import React from 'react';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { act, render, fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import ExperimentalSettings from './';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';
import { ExperimentalSelectorsIDs } from './ExperimentalView.testIds';
import { strings } from '../../../../../locales/i18n';

// Mock the required dependencies
jest.mock('react-native-blob-util', () => {
  const fsMock = {
    dirs: {
      DocumentDir: '/mock/docs',
    },
    writeFile: jest.fn().mockResolvedValue(true),
    readFile: jest.fn().mockResolvedValue(''),
    exists: jest.fn().mockResolvedValue(true),
    mkdir: jest.fn().mockResolvedValue(true),
    unlink: jest.fn().mockResolvedValue(true),
    stat: jest.fn().mockResolvedValue({ size: 0 }),
    ls: jest.fn().mockResolvedValue([]),
  };
  return {
    default: {
      fs: fsMock,
    },
    fs: fsMock,
  };
});

jest.mock('react-native-share', () => ({
  open: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn(),
  getVersion: jest.fn(),
  getBuildNumber: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        logout: jest.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  selectIsDaimoDemo: jest.fn((state) => state.card.isDaimoDemo),
  setIsDaimoDemo: jest.fn((value) => ({
    type: 'card/setIsDaimoDemo',
    payload: value,
  })),
}));

const mockStore = configureMockStore();

const initialState = {
  experimentalSettings: {
    securityAlertsEnabled: true,
  },
  performance: {
    sessionId: 'test-session-id',
    startTime: 1713120000,
    metrics: [],
    environment: {
      branch: 'main',
      commitHash: '1234567890',
      platform: 'ios',
      appVersion: '1.0.0',
    },
    activeTraceBySessionId: {},
    isInitialized: true,
  },
  card: {
    isAuthenticatedCard: false,
    cardholderAccounts: [],
    isDaimoDemo: false,
  },
  engine: {
    backgroundState,
  },
};

const store = mockStore(initialState);

const authenticatedState = {
  ...initialState,
  engine: {
    backgroundState: {
      ...backgroundState,
      CardController: {
        ...backgroundState.CardController,
        isAuthenticated: true,
      },
    },
  },
};

const goBack = jest.fn();

const renderExperimentalSettings = (
  testStore: ReturnType<typeof mockStore> = store,
) =>
  render(
    <Provider store={testStore}>
      <ThemeContext.Provider value={mockTheme}>
        <ExperimentalSettings
          navigation={{
            goBack,
          }}
          route={{}}
        />
      </ThemeContext.Provider>
    </Provider>,
  );

const cardLogoutMock = () => Engine.context.CardController.logout as jest.Mock;

describe('ExperimentalSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ExperimentalSettings
            navigation={{
              goBack,
            }}
            route={{}}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(
      getByText(strings('app_settings.experimental_title')),
    ).toBeOnTheScreen();
  });

  it('renders inline HeaderStandard with title and back button', () => {
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ExperimentalSettings
            navigation={{
              goBack,
            }}
            route={{}}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(
      getByTestId(ExperimentalSelectorsIDs.EXPERIMENTAL_SETTINGS_HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ExperimentalSelectorsIDs.EXPERIMENTAL_SETTINGS_BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('app_settings.experimental_title')),
    ).toBeOnTheScreen();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ExperimentalSettings
            navigation={{
              goBack,
            }}
            route={{}}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    fireEvent.press(
      getByTestId(ExperimentalSelectorsIDs.EXPERIMENTAL_SETTINGS_BACK_BUTTON),
    );
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  describe('downloadPerformanceMetrics', () => {
    it('should download and share performance metrics successfully', async () => {
      // Mock device info responses
      (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
      (getVersion as jest.Mock).mockResolvedValue('1.0.0');
      (getBuildNumber as jest.Mock).mockResolvedValue('100');

      const wrapper = render(
        <Provider store={store}>
          <ThemeContext.Provider value={mockTheme}>
            <ExperimentalSettings
              navigation={{
                goBack,
              }}
              route={{}}
            />
          </ThemeContext.Provider>
        </Provider>,
      );

      const downloadButton = wrapper.getByTestId(
        'download-performance-metrics-button',
      );
      fireEvent.press(downloadButton);

      await new Promise(process.nextTick);

      // Verify file was written
      expect(ReactNativeBlobUtil.fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('/mock/docs/performance-metrics-'),
        expect.any(String),
        'utf8',
      );

      // Verify share was called with correct parameters
      expect(Share.open).toHaveBeenCalledWith({
        title: 'TestApp Performance Metrics - v1.0.0 (100)',
        subject: 'TestApp Performance Metrics - v1.0.0 (100)',
        url: expect.stringContaining('file:///mock/docs/performance-metrics-'),
        type: 'application/json',
      });
    });

    it('should handle errors when downloading performance metrics', async () => {
      // Mock device info responses
      (getApplicationName as jest.Mock).mockResolvedValue('TestApp');
      (getVersion as jest.Mock).mockResolvedValue('1.0.0');
      (getBuildNumber as jest.Mock).mockResolvedValue('100');

      // Mock an error in writeFile
      (ReactNativeBlobUtil.fs.writeFile as jest.Mock).mockRejectedValue(
        new Error('Write failed'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const wrapper = render(
        <Provider store={store}>
          <ThemeContext.Provider value={mockTheme}>
            <ExperimentalSettings
              navigation={{
                goBack,
              }}
              route={{}}
            />
          </ThemeContext.Provider>
        </Provider>,
      );

      const downloadButton = wrapper.getByTestId(
        'download-performance-metrics-button',
      );
      fireEvent.press(downloadButton);

      await new Promise(process.nextTick);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error downloading performance metrics:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('card logout', () => {
    beforeEach(() => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('hides the card logout section when the user is not authenticated', () => {
      const { queryByTestId } = renderExperimentalSettings();

      expect(
        queryByTestId(ExperimentalSelectorsIDs.CARD_LOGOUT_BUTTON),
      ).toBeNull();
    });

    it('shows the card logout section when the user is authenticated', () => {
      const { getByTestId, getByText } = renderExperimentalSettings(
        mockStore(authenticatedState),
      );

      expect(
        getByTestId(ExperimentalSelectorsIDs.CARD_LOGOUT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('experimental_settings.card_logout_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('experimental_settings.card_logout_cta')),
      ).toBeOnTheScreen();
    });

    it('calls CardController.logout when logout is confirmed', async () => {
      const { getByTestId } = renderExperimentalSettings(
        mockStore(authenticatedState),
      );

      fireEvent.press(getByTestId(ExperimentalSelectorsIDs.CARD_LOGOUT_BUTTON));

      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
        style?: string;
        onPress?: () => void;
      }[];
      const confirm = buttons.find((button) => button.style === 'destructive');

      await act(async () => {
        confirm?.onPress?.();
      });

      expect(cardLogoutMock()).toHaveBeenCalledTimes(1);
    });

    it('does not call CardController.logout when logout is cancelled', () => {
      const { getByTestId } = renderExperimentalSettings(
        mockStore(authenticatedState),
      );

      fireEvent.press(getByTestId(ExperimentalSelectorsIDs.CARD_LOGOUT_BUTTON));

      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
        style?: string;
        onPress?: () => void;
      }[];
      const cancel = buttons.find((button) => button.style === 'cancel');
      cancel?.onPress?.();

      expect(cardLogoutMock()).not.toHaveBeenCalled();
    });
  });
});
