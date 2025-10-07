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

describe('AppInformation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApplicationName.mockResolvedValue('MetaMask');
    mockGetVersion.mockResolvedValue('7.0.0');
    mockGetBuildNumber.mockResolvedValue('1000');
    mockIsQa.mockReturnValue(false);
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
});
