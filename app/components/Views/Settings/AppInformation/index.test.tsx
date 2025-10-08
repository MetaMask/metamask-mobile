import { waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import AppInformation from './';
import { AboutMetaMaskSelectorsIDs } from '../../../../../e2e/selectors/Settings/AboutMetaMask.selectors';

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

// Mock getFeatureFlagAppEnvironment
const mockGetFeatureFlagAppEnvironment = jest.fn();
jest.mock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller/utils',
  () => ({
    getFeatureFlagAppEnvironment: () => mockGetFeatureFlagAppEnvironment(),
  }),
);

describe('AppInformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApplicationName.mockResolvedValue('MetaMask');
    mockGetVersion.mockResolvedValue('7.0.0');
    mockGetBuildNumber.mockResolvedValue('1000');
    mockIsQa.mockReturnValue(false);
    mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');
  });

  it('renders correctly with snapshot', () => {
    const { toJSON } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the container with correct testID', () => {
    const { getByTestId } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: {} },
    );

    expect(getByTestId(AboutMetaMaskSelectorsIDs.CONTAINER)).toBeTruthy();
  });

  it('displays app information after mount', async () => {
    const { getByText } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: {} },
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
        { state: {} },
      );

      // Given the component is rendered
      // When we check for link texts
      // Then all expected links should be present
      expect(getByText(/Privacy Policy/)).toBeTruthy();
      expect(getByText(/Terms of use/)).toBeTruthy();
      expect(getByText(/Attributions/)).toBeTruthy();
      expect(getByText(/Visit our Support Center/)).toBeTruthy();
      expect(getByText(/Visit our Website/)).toBeTruthy();
      expect(getByText(/Contact Us/)).toBeTruthy();
    });

    it('renders the links section title', () => {
      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: {} },
      );

      expect(getByText(/Links/)).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('fetches device info on mount', async () => {
      renderScreen(AppInformation, { name: 'AppInformation' }, { state: {} });

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
        { state: {} },
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
        { state: {} },
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

    it('displays remote feature flag environment when not in production', async () => {
      // Given the environment is not production
      process.env.METAMASK_ENVIRONMENT = 'dev';
      mockGetFeatureFlagAppEnvironment.mockReturnValue('Development');

      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: {} },
      );

      // When the component renders
      // Then it should display the remote feature flag environment
      await waitFor(() => {
        expect(getByText('Remote Feature Flag Env: Development')).toBeTruthy();
      });
    });

    it('does not display remote feature flag environment in production', () => {
      // Given the environment is production
      process.env.METAMASK_ENVIRONMENT = 'production';

      const { queryByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: {} },
      );

      // When the component renders
      // Then it should not display the remote feature flag environment
      expect(queryByText(/Remote Feature Flag Env:/)).toBeNull();
    });

    it('displays METAMASK_ENVIRONMENT when not in production', async () => {
      // Given the environment is not production
      process.env.METAMASK_ENVIRONMENT = 'dev';

      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: {} },
      );

      // When the component renders
      // Then it should display the environment
      await waitFor(() => {
        expect(getByText('Environment: dev')).toBeTruthy();
      });
    });

    it('displays branch information when isQa is true', async () => {
      // Given isQa returns true and environment is not production
      process.env.METAMASK_ENVIRONMENT = 'dev';
      process.env.GIT_BRANCH = 'feature/test-branch';
      mockIsQa.mockReturnValue(true);

      const { getByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: {} },
      );

      // When the component renders
      // Then it should display the branch information
      await waitFor(() => {
        expect(getByText('Branch: feature/test-branch')).toBeTruthy();
      });
    });

    it('does not display branch information when isQa is false', () => {
      // Given isQa returns false
      mockIsQa.mockReturnValue(false);

      const { queryByText } = renderScreen(
        AppInformation,
        { name: 'AppInformation' },
        { state: {} },
      );

      // When the component renders
      // Then it should not display the branch information
      expect(queryByText(/Branch:/)).toBeNull();
    });
  });
});
