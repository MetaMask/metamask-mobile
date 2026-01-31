import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { render, fireEvent } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import ExperimentalSettings from './';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';

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

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardExperimentalSwitch: jest.fn(() => false),
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  selectAlwaysShowCardButton: jest.fn(
    (state) => state.card.alwaysShowCardButton,
  ),
  setAlwaysShowCardButton: jest.fn((value) => ({
    type: 'card/setAlwaysShowCardButton',
    payload: value,
  })),
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
    alwaysShowCardButton: false,
    isAuthenticatedCard: false,
    cardholderAccounts: [],
    isDaimoDemo: false,
  },
  engine: {
    backgroundState,
  },
};

const store = mockStore(initialState);

const setOptions = jest.fn();

describe('ExperimentalSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ExperimentalSettings
            navigation={{
              setOptions,
            }}
            route={{}}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
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
                setOptions,
              }}
              route={{}}
            />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Find and press the download button using a more specific selector
      const downloadButton = wrapper.getByTestId(
        'download-performance-metrics-button',
      );
      fireEvent.press(downloadButton);

      // Wait for all promises to resolve
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
                setOptions,
              }}
              route={{}}
            />
          </ThemeContext.Provider>
        </Provider>,
      );

      // Find and press the download button using a more specific selector
      const downloadButton = wrapper.getByTestId(
        'download-performance-metrics-button',
      );
      fireEvent.press(downloadButton);

      // Wait for all promises to resolve
      await new Promise(process.nextTick);

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error downloading performance metrics:',
        expect.any(Error),
      );

      // Clean up
      consoleSpy.mockRestore();
    });
  });
});
