import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { Image, TouchableOpacity, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import renderWithProvider, {
  DeepPartial,
  renderScreen,
} from '../../../../util/test/renderWithProvider';
import AppInformation from './';
import { AboutMetaMaskSelectorsIDs } from './AboutMetaMask.testIds';
import { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

// Mock device info
const mockGetApplicationName = jest.fn();
const mockGetVersion = jest.fn();
const mockGetBuildNumber = jest.fn();

jest.mock('react-native-device-info', () => ({
  getApplicationName: () => mockGetApplicationName(),
  getVersion: () => mockGetVersion(),
  getBuildNumber: () => mockGetBuildNumber(),
}));

// Mock isProduction utility
const mockIsProduction = jest.fn();
jest.mock('../../../../util/environment', () => ({
  isProduction: () => mockIsProduction(),
}));

// Mock getFeatureFlagAppEnvironment and getFeatureFlagAppDistribution
const mockGetFeatureFlagAppEnvironment = jest.fn();
const mockGetFeatureFlagAppDistribution = jest.fn();
jest.mock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller/utils',
  () => ({
    getFeatureFlagAppEnvironment: () => mockGetFeatureFlagAppEnvironment(),
    getFeatureFlagAppDistribution: () => mockGetFeatureFlagAppDistribution(),
  }),
);

jest.mock('../../../../constants/ota', () => ({
  OTA_VERSION: 'v0',
}));

const MOCK_STATE = {
  engine: {
    backgroundState: {
      SnapController: {
        snaps: {
          'npm:@metamask/solana-snap': {
            id: 'npm:@metamask/solana-snap',
            enabled: true,
            version: '1.7.0',
            status: 'running',
            manifest: {
              proposedName: 'Solana',
              description: 'Manage Solana using MetaMask',
            },
            preinstalled: true,
          },
        },
      },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          enabledBooleanFlag: true,
          disabledBooleanFlag: false,
          enabledObjectFlag: { enabled: true, value: 'test' },
          disabledObjectFlag: { enabled: false, value: 'test' },
          enabledArrayFlag: ['item1', 'item2'],
          emptyArrayFlag: [],
          stringFlag: 'some-value',
          nullFlag: null,
        },
        localOverrides: {},
      },
    },
  },
} as DeepPartial<RootState>;

describe('AppInformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApplicationName.mockResolvedValue('MetaMask');
    mockGetVersion.mockResolvedValue('7.0.0');
    mockGetBuildNumber.mockResolvedValue('1000');
    mockIsProduction.mockReturnValue(true);
    mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');
    mockGetFeatureFlagAppDistribution.mockReturnValue('main');
    mockAlert.mockClear();
    (Clipboard.setString as jest.Mock).mockClear();
  });

  it('renders correctly with snapshot', async () => {
    const { getByText } = renderScreen(
      AppInformation,
      { name: 'AppInformation', options: { headerShown: false } },
      { state: MOCK_STATE },
    );
    await waitFor(() => {
      expect(getByText('MetaMask v7.0.0 (1000)')).toBeOnTheScreen();
    });
    expect(getByText(strings('app_settings.info_title'))).toBeOnTheScreen();
  });

  it('renders the container with correct testID', () => {
    const { getByTestId } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: MOCK_STATE },
    );

    expect(getByTestId(AboutMetaMaskSelectorsIDs.CONTAINER)).toBeTruthy();
  });

  describe('Header', () => {
    it('renders header with correct title', () => {
      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      expect(getByText(strings('app_settings.info_title'))).toBeOnTheScreen();
    });

    it('calls navigation.goBack when back button is pressed', () => {
      const mockGoBack = jest.fn();
      const mockNavigation = {
        goBack: mockGoBack,
        navigate: jest.fn(),
      };

      const { getByTestId } = renderWithProvider(
        <AppInformation navigation={mockNavigation} />,
        { state: MOCK_STATE },
        false,
      );

      fireEvent.press(getByTestId(AboutMetaMaskSelectorsIDs.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('displays app information after mount', async () => {
    const { getByText } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: MOCK_STATE },
    );

    // Given the device info is mocked
    // When the component mounts and fetches the info
    // Then it should display the formatted app information
    await waitFor(() => {
      expect(getByText('MetaMask v7.0.0 (1000)')).toBeTruthy();
    });
  });

  describe('Link Rendering', () => {
    it('renders all information links', () => {
      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // Given the component is rendered
      // When we check for link texts
      // Then all expected links should be present
      expect(getByText(/Privacy Policy/)).toBeTruthy();
      expect(getByText(/Terms of use/)).toBeTruthy();
      expect(getByText(/Attributions/)).toBeTruthy();
      expect(getByText(/Visit our support center/)).toBeTruthy();
      expect(getByText(/Visit our website/)).toBeTruthy();
      expect(getByText(/Contact us/)).toBeTruthy();
    });

    it('renders the links section title', () => {
      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      expect(getByText(/Links/)).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('fetches device info on mount', async () => {
      renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // Given the component is mounted
      // When the componentDidMount lifecycle method runs
      // Then it should fetch all device information
      await waitFor(() => {
        expect(mockGetApplicationName).toHaveBeenCalled();
        expect(mockGetVersion).toHaveBeenCalled();
        expect(mockGetBuildNumber).toHaveBeenCalled();
      });
    });

    it('displays formatted app version correctly', async () => {
      mockGetApplicationName.mockResolvedValue('TestApp');
      mockGetVersion.mockResolvedValue('1.2.3');
      mockGetBuildNumber.mockResolvedValue('456');

      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // Given device info returns specific values
      // When the component renders
      // Then it should format and display them correctly
      await waitFor(() => {
        expect(getByText('TestApp v1.2.3 (456)')).toBeTruthy();
      });
    });
  });

  describe('Image Rendering', () => {
    it('renders the MetaMask fox logo', () => {
      const { UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // Given the component is rendered
      // When we look for Image components
      // Then the fox logo should be present
      const images = UNSAFE_getAllByType(Image);
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Information Display', () => {
    const originalEnv = process.env.METAMASK_ENVIRONMENT;

    afterEach(() => {
      process.env.METAMASK_ENVIRONMENT = originalEnv;
    });

    it('does not display environment information initially', () => {
      // Given the environment is not production
      process.env.METAMASK_ENVIRONMENT = 'dev';
      mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');
      mockGetFeatureFlagAppDistribution.mockReturnValue('main');

      const { queryByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // When the component renders
      // Then it should not display the environment information initially
      expect(queryByText(/Environment:/)).not.toBeOnTheScreen();
      expect(queryByText(/Remote Feature Flag Env:/)).not.toBeOnTheScreen();
      expect(
        queryByText(/Remote Feature Flag Distribution:/),
      ).not.toBeOnTheScreen();
    });

    it('displays environment information after long-pressing fox icon', async () => {
      // Given the environment is set
      process.env.METAMASK_ENVIRONMENT = 'dev';
      mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');
      mockGetFeatureFlagAppDistribution.mockReturnValue('main');

      const { getByText, UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // When the user long-presses the fox icon
      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );
      expect(foxTouchable).toBeDefined();

      if (foxTouchable) {
        fireEvent(foxTouchable, 'longPress');
      }

      // Then it should display all environment information fields
      await waitFor(() => {
        expect(getByText(/Environment:/)).toBeTruthy();
        expect(getByText('Remote Feature Flag Env: Development')).toBeTruthy();
        expect(
          getByText('Remote Feature Flag Distribution: main'),
        ).toBeTruthy();
        expect(getByText('Solana: 1.7.0 (running)')).toBeTruthy();
      });
    });

    it('displays environment information in production after long-press', async () => {
      // Given the environment is production
      process.env.METAMASK_ENVIRONMENT = 'production';
      mockGetFeatureFlagAppEnvironment.mockReturnValue('Production');
      mockGetFeatureFlagAppDistribution.mockReturnValue('production');

      const { queryByText, getByText, UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // When initially rendered
      // Then environment info should be hidden
      expect(queryByText(/Environment:/)).not.toBeOnTheScreen();
      expect(queryByText(/Remote Feature Flag Env:/)).not.toBeOnTheScreen();
      expect(
        queryByText(/Remote Feature Flag Distribution:/),
      ).not.toBeOnTheScreen();

      // When the user long-presses the fox icon
      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );

      if (foxTouchable) {
        fireEvent(foxTouchable, 'longPress');
      }

      // Then it should display all environment information even in production
      await waitFor(() => {
        expect(getByText(/Environment:/)).toBeTruthy();
        expect(getByText('Remote Feature Flag Env: Production')).toBeTruthy();
        expect(
          getByText('Remote Feature Flag Distribution: production'),
        ).toBeTruthy();
      });
    });

    it('displays build type and branch information for non-production builds', async () => {
      // Given isProduction returns false (non-production build)
      mockIsProduction.mockReturnValue(false);

      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // When the component renders
      // Then it should display the build type and branch information
      // Note: env vars are inlined at build time, so we check the format pattern
      await waitFor(() => {
        expect(getByText(/\| Branch:/)).toBeOnTheScreen();
      });
    });

    it('does not display branch information for production builds', async () => {
      // Given isProduction returns true (production build)
      process.env.GIT_BRANCH = 'main';
      process.env.METAMASK_ENVIRONMENT = 'production';
      mockIsProduction.mockReturnValue(true);

      const { queryByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // When the component renders
      // Then it should NOT display the branch information
      await waitFor(() => {
        expect(queryByText(/Branch:/)).not.toBeOnTheScreen();
      });
    });
  });

  describe('Fox Icon Long Press Interaction', () => {
    const originalEnv = process.env.METAMASK_ENVIRONMENT;

    afterEach(() => {
      process.env.METAMASK_ENVIRONMENT = originalEnv;
    });

    it('fox icon has a TouchableOpacity wrapper with long press handler', () => {
      const { UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // Given the component is rendered
      // When we look for TouchableOpacity components with onLongPress
      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );

      // Then the fox touchable should exist with proper configuration
      expect(foxTouchable).toBeDefined();
      expect(foxTouchable?.props.delayLongPress).toBe(10000); // 10 seconds
      expect(foxTouchable?.props.activeOpacity).toBe(1);
    });

    it('toggles showEnvironmentInfo state when long-pressed', async () => {
      process.env.METAMASK_ENVIRONMENT = 'staging';
      mockGetFeatureFlagAppEnvironment.mockReturnValue('Staging');
      mockGetFeatureFlagAppDistribution.mockReturnValue('staging-dist');

      const { queryByText, getByText, UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // Given environment info is initially hidden
      expect(queryByText(/Environment:/)).not.toBeOnTheScreen();

      // When the fox icon is long-pressed
      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );

      if (foxTouchable) {
        fireEvent(foxTouchable, 'longPress');
      }

      // Then all environment info fields should become visible
      await waitFor(() => {
        expect(getByText(/Environment:/)).toBeTruthy();
        expect(getByText('Remote Feature Flag Env: Staging')).toBeTruthy();
        expect(
          getByText('Remote Feature Flag Distribution: staging-dist'),
        ).toBeTruthy();
      });
    });

    it('environment info persists after being shown', async () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');
      mockGetFeatureFlagAppDistribution.mockReturnValue('dev-dist');

      const { getByText, queryByText, UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // Given environment info is initially hidden
      expect(queryByText(/Environment:/)).not.toBeOnTheScreen();

      // When the fox icon is long-pressed
      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );

      if (foxTouchable) {
        fireEvent(foxTouchable, 'longPress');
      }

      // Then all environment info should become visible
      await waitFor(() => {
        expect(getByText(/Environment:/)).toBeTruthy();
        expect(getByText('Remote Feature Flag Env: Development')).toBeTruthy();
        expect(
          getByText('Remote Feature Flag Distribution: dev-dist'),
        ).toBeTruthy();
      });

      // And it should remain visible (state persists)
      expect(getByText(/Environment:/)).toBeTruthy();
      expect(getByText('Remote Feature Flag Env: Development')).toBeTruthy();
      expect(
        getByText('Remote Feature Flag Distribution: dev-dist'),
      ).toBeTruthy();
    });

    it('displays remote feature flag distribution from utils', async () => {
      // Given distribution is mocked with a specific value
      process.env.METAMASK_ENVIRONMENT = 'dev';
      mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');
      mockGetFeatureFlagAppDistribution.mockReturnValue('custom-distribution');

      const { getByText, UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // When the fox icon is long-pressed
      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );

      if (foxTouchable) {
        fireEvent(foxTouchable, 'longPress');
      }

      // Then it should display the mocked distribution value
      await waitFor(() => {
        expect(getByText(/Environment:/)).toBeTruthy();
        expect(
          getByText('Remote Feature Flag Distribution: custom-distribution'),
        ).toBeTruthy();
      });
    });
  });

  describe('OTA Updates Information Display', () => {
    it('does not display OTA updates information initially', () => {
      const { queryByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      expect(queryByText(/Update ID:/)).not.toBeOnTheScreen();
      expect(queryByText(/OTA Update Channel:/)).not.toBeOnTheScreen();
      expect(queryByText(/OTA Update runtime version:/)).not.toBeOnTheScreen();
      expect(queryByText(/Check Automatically:/)).not.toBeOnTheScreen();
      expect(queryByText(/OTA Update status:/)).not.toBeOnTheScreen();
    });

    it('displays OTA updates information after long-pressing fox icon when OTA updates are enabled', async () => {
      const { getByText, UNSAFE_getAllByType } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );

      if (foxTouchable) {
        fireEvent(foxTouchable, 'longPress');
      }

      await waitFor(() => {
        expect(getByText(/Update ID: mock-update-id/)).toBeTruthy();
        expect(getByText(/OTA Update Channel: test-channel/)).toBeTruthy();
        expect(getByText(/OTA Update runtime version: 1.0.0/)).toBeTruthy();
        expect(getByText(/Check Automatically: NEVER/)).toBeTruthy();
        expect(getByText(/OTA Update status:/)).toBeTruthy();
      });
    });
  });

  describe('Feature Flags Display', () => {
    const triggerLongPress = (screen: ReturnType<typeof renderScreen>) => {
      const touchableOpacities = screen.UNSAFE_getAllByType(TouchableOpacity);
      const foxTouchable = touchableOpacities.find(
        (item) => item.props.onLongPress !== undefined,
      );
      if (foxTouchable) {
        fireEvent(foxTouchable, 'longPress');
      }
    };

    it('does not display feature flags section initially', () => {
      const { queryByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      expect(queryByText(/Feature Flags/)).toBeNull();
    });

    it('displays feature flags section after long-pressing fox icon', async () => {
      const screen = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      triggerLongPress(screen);

      await waitFor(() => {
        // Should show 5 enabled flags: enabledBooleanFlag, enabledObjectFlag, enabledArrayFlag, stringFlag
        expect(screen.getByText(/Feature Flags \(4 enabled\)/)).toBeTruthy();
      });
    });

    it('expands feature flags list when tapped', async () => {
      const screen = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      triggerLongPress(screen);

      await waitFor(() => {
        expect(screen.getByText(/Feature Flags \(4 enabled\)/)).toBeTruthy();
      });

      // Tap to expand
      fireEvent.press(screen.getByText(/Feature Flags \(4 enabled\)/));

      await waitFor(() => {
        expect(screen.getByText('Copy All to Clipboard')).toBeTruthy();
        expect(screen.getByText('• enabledArrayFlag')).toBeTruthy();
        expect(screen.getByText('• enabledBooleanFlag')).toBeTruthy();
        expect(screen.getByText('• enabledObjectFlag')).toBeTruthy();
        expect(screen.getByText('• stringFlag')).toBeTruthy();
      });

      // Should not show disabled flags
      expect(screen.queryByText('• disabledBooleanFlag')).toBeNull();
      expect(screen.queryByText('• disabledObjectFlag')).toBeNull();
      expect(screen.queryByText('• emptyArrayFlag')).toBeNull();
      expect(screen.queryByText('• nullFlag')).toBeNull();
    });

    it('collapses feature flags list when tapped again', async () => {
      const screen = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      triggerLongPress(screen);

      await waitFor(() => {
        expect(screen.getByText(/Feature Flags \(4 enabled\)/)).toBeTruthy();
      });

      // Tap to expand
      fireEvent.press(screen.getByText(/Feature Flags \(4 enabled\)/));

      await waitFor(() => {
        expect(screen.getByText('Copy All to Clipboard')).toBeTruthy();
      });

      // Tap again to collapse
      fireEvent.press(screen.getByText(/Feature Flags \(4 enabled\)/));

      await waitFor(() => {
        expect(screen.queryByText('Copy All to Clipboard')).toBeNull();
        expect(screen.queryByText('• enabledBooleanFlag')).toBeNull();
      });
    });

    it('copies all feature flags to clipboard when copy button is pressed', async () => {
      const screen = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      triggerLongPress(screen);

      await waitFor(() => {
        expect(screen.getByText(/Feature Flags \(4 enabled\)/)).toBeTruthy();
      });

      // Tap to expand
      fireEvent.press(screen.getByText(/Feature Flags \(4 enabled\)/));

      await waitFor(() => {
        expect(screen.getByText('Copy All to Clipboard')).toBeTruthy();
      });

      // Tap copy button
      fireEvent.press(screen.getByText('Copy All to Clipboard'));

      expect(Clipboard.setString).toHaveBeenCalledWith(
        expect.stringContaining('enabledBooleanFlag'),
      );
      expect(mockAlert).toHaveBeenCalledWith(
        'Copied',
        'Feature flags copied to clipboard',
      );
    });

    it('displays enabled flags in alphabetical order', async () => {
      const screen = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      triggerLongPress(screen);

      await waitFor(() => {
        expect(screen.getByText(/Feature Flags \(4 enabled\)/)).toBeTruthy();
      });

      // Tap to expand
      fireEvent.press(screen.getByText(/Feature Flags \(4 enabled\)/));

      await waitFor(() => {
        const flagTexts = screen
          .getAllByText(/^• /)
          .map((node) => node.props.children);
        expect(flagTexts).toEqual([
          '• enabledArrayFlag',
          '• enabledBooleanFlag',
          '• enabledObjectFlag',
          '• stringFlag',
        ]);
      });
    });

    it('handles empty feature flags gracefully', async () => {
      const emptyState = {
        ...MOCK_STATE,
        engine: {
          ...MOCK_STATE.engine,
          backgroundState: {
            ...MOCK_STATE.engine?.backgroundState,
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              localOverrides: {},
            },
          },
        },
      } as DeepPartial<RootState>;

      const screen = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: emptyState },
      );

      triggerLongPress(screen);

      await waitFor(() => {
        expect(screen.getByText(/Feature Flags \(0 enabled\)/)).toBeTruthy();
      });
    });
  });
});
