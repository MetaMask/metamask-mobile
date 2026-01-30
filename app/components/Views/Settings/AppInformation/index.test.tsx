import { waitFor, fireEvent } from '@testing-library/react-native';
import { Image, TouchableOpacity } from 'react-native';
import {
  DeepPartial,
  renderScreen,
} from '../../../../util/test/renderWithProvider';
import AppInformation from './';
import { AboutMetaMaskSelectorsIDs } from './AboutMetaMask.testIds';
import { RootState } from '../../../../reducers';

// Mock device info
const mockGetApplicationName = jest.fn();
const mockGetVersion = jest.fn();
const mockGetBuildNumber = jest.fn();

jest.mock('react-native-device-info', () => ({
  getApplicationName: () => mockGetApplicationName(),
  getVersion: () => mockGetVersion(),
  getBuildNumber: () => mockGetBuildNumber(),
}));

// Mock isQa utility
const mockIsQa = jest.fn();
jest.mock('../../../../util/test/utils', () => ({
  isQa: () => mockIsQa(),
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

jest.mock('../../../../constants/ota', () => {
  const actual = jest.requireActual('../../../../constants/ota');

  return {
    ...actual,
    // Make getFullVersion a pass-through so tests don't depend on OTA_VERSION
    getFullVersion: (appVersion: string) => appVersion,
  };
});

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
    },
  },
} as DeepPartial<RootState>;

describe('AppInformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApplicationName.mockResolvedValue('MetaMask');
    mockGetVersion.mockResolvedValue('7.0.0');
    mockGetBuildNumber.mockResolvedValue('1000');
    mockIsQa.mockReturnValue(false);
    mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');
    mockGetFeatureFlagAppDistribution.mockReturnValue('main');
  });

  it('renders correctly with snapshot', () => {
    const { toJSON } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: MOCK_STATE },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the container with correct testID', () => {
    const { getByTestId } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: MOCK_STATE },
    );

    expect(getByTestId(AboutMetaMaskSelectorsIDs.CONTAINER)).toBeTruthy();
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
      expect(queryByText(/Environment:/)).toBeNull();
      expect(queryByText(/Remote Feature Flag Env:/)).toBeNull();
      expect(queryByText(/Remote Feature Flag Distribution:/)).toBeNull();
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
      expect(queryByText(/Environment:/)).toBeNull();
      expect(queryByText(/Remote Feature Flag Env:/)).toBeNull();
      expect(queryByText(/Remote Feature Flag Distribution:/)).toBeNull();

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

    it('displays branch information when isQa is true', async () => {
      // Given isQa returns true
      process.env.GIT_BRANCH = 'feature/test-branch';
      mockIsQa.mockReturnValue(true);

      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: MOCK_STATE },
      );

      // When the component renders
      // Then it should display the branch information (this is always visible for QA)
      await waitFor(() => {
        expect(getByText(/Branch:/)).toBeTruthy();
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
      expect(queryByText(/Environment:/)).toBeNull();

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
      expect(queryByText(/Environment:/)).toBeNull();

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

      expect(queryByText(/Update ID:/)).toBeNull();
      expect(queryByText(/OTA Update Channel:/)).toBeNull();
      expect(queryByText(/OTA Update runtime version:/)).toBeNull();
      expect(queryByText(/Check Automatically:/)).toBeNull();
      expect(queryByText(/OTA Update status:/)).toBeNull();
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
});
