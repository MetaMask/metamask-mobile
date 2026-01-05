import React from 'react';
import { View } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SampleFeature from './SampleFeature';
import initialRootState from '../../../../util/test/initial-root-state';
import { selectSampleFeatureCounterEnabled } from '../../selectors/sampleFeatureCounter';
import useSampleNetwork from '../hooks/useSampleNetwork/useSampleNetwork';
import { strings } from '../../../../../locales/i18n';

/**
 * Mock implementation for react-native Linking module
 * Required for testing components that use deep linking functionality
 */
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

/**
 * Mock the feature flag selector to control test scenarios
 */
jest.mock('../../selectors/sampleFeatureCounter', () => ({
  selectSampleFeatureCounterEnabled: jest.fn(),
}));

/**
 * Mock the useSampleNetwork hook
 */
jest.mock('../hooks/useSampleNetwork/useSampleNetwork', () => ({
  __esModule: true,
  default: jest.fn(),
}));

/**
 * Mock i18n strings
 */
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'sample_feature.title': 'Sample Feature Title',
      'sample_feature.description': 'Sample Feature Description',
    };
    return mockStrings[key] || key;
  }),
}));

/**
 * Mock components using Jest's allowed mock-prefixed variables
 */
const MockView = View;

/**
 * Mock child components to isolate SampleFeature testing
 */
let mockSampleNetworkDisplay: jest.Mock;

jest.mock('./SampleNetworkDisplay/SampleNetworkDisplay', () => {
  mockSampleNetworkDisplay = jest.fn(
    ({ name, imageSource }: { name: string; imageSource: unknown }) => (
      <MockView testID="mocked-sample-network-display">
        <MockView testID="network-name">{name}</MockView>
        <MockView testID="network-image">
          {JSON.stringify(imageSource)}
        </MockView>
      </MockView>
    ),
  );
  return {
    SampleNetworkDisplay: mockSampleNetworkDisplay,
  };
});

jest.mock('./SampleCounterPane/SampleCounterPane', () => ({
  SampleCounterPane: () => <MockView testID="mocked-sample-counter-pane" />,
}));

jest.mock('./SamplePetNames/SamplePetNames', () => ({
  SamplePetNames: () => <MockView testID="mocked-sample-pet-names" />,
}));

/**
 * Test suite for SampleFeature component
 *
 * @group Components
 * @group SampleFeature
 */
describe('SampleFeature', () => {
  const mockSelectSampleFeatureCounterEnabled =
    selectSampleFeatureCounterEnabled as jest.MockedFunction<
      typeof selectSampleFeatureCounterEnabled
    >;
  const mockUseSampleNetwork = useSampleNetwork as jest.MockedFunction<
    typeof useSampleNetwork
  >;
  const mockStrings = strings as jest.MockedFunction<typeof strings>;

  const mockNetworkData = {
    networkName: 'Ethereum Mainnet',
    networkImageSource: { uri: 'https://example.com/ethereum.png' },
    chainId: '0x1' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSampleNetwork.mockReturnValue(mockNetworkData);
    mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);
  });

  describe('Rendering', () => {
    it('renders KeyboardAwareScrollView with correct testID', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      const { getByTestId } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(getByTestId('sample-feature-container')).toBeDefined();
    });

    it('displays title text from i18n strings', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      const { getByText } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(getByText('Sample Feature Title')).toBeDefined();
      expect(mockStrings).toHaveBeenCalledWith('sample_feature.title');
    });

    it('displays description text from i18n strings', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      const { getByText } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(getByText('Sample Feature Description')).toBeDefined();
      expect(mockStrings).toHaveBeenCalledWith('sample_feature.description');
    });

    it('calls useSampleNetwork hook', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(mockUseSampleNetwork).toHaveBeenCalledTimes(1);
    });

    it('renders SampleNetworkDisplay with network data from hook', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      const { getByTestId } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      const networkDisplay = getByTestId('mocked-sample-network-display');
      expect(networkDisplay).toBeDefined();
      expect(getByTestId('network-name')).toBeDefined();
    });

    it('passes correct props to SampleNetworkDisplay from useSampleNetwork hook', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);
      const expectedNetworkName = 'Polygon Mainnet';
      const expectedImageSource = { uri: 'https://example.com/polygon.png' };
      mockUseSampleNetwork.mockReturnValue({
        networkName: expectedNetworkName,
        networkImageSource: expectedImageSource,
        chainId: '0x89' as const,
      });

      // Act
      renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(mockSampleNetworkDisplay).toHaveBeenCalledWith(
        {
          name: expectedNetworkName,
          imageSource: expectedImageSource,
        },
        expect.anything(),
      );
    });

    it('always renders SamplePetNames component', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      const { getByTestId } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(getByTestId('mocked-sample-pet-names')).toBeDefined();
    });
  });

  describe('Feature Flag Conditional Rendering', () => {
    it('renders SampleCounterPane when feature flag is enabled', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(true);

      // Act
      const { getByTestId } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(getByTestId('mocked-sample-counter-pane')).toBeDefined();
    });

    it('does not render SampleCounterPane when feature flag is disabled', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      const { queryByTestId } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(queryByTestId('mocked-sample-counter-pane')).toBeNull();
    });
  });

  describe('Snapshot Tests', () => {
    it('matches rendered snapshot when feature flag is enabled', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(true);

      // Act
      const { toJSON } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches rendered snapshot when feature flag is disabled', () => {
      // Arrange
      mockSelectSampleFeatureCounterEnabled.mockReturnValue(false);

      // Act
      const { toJSON } = renderWithProvider(<SampleFeature />, {
        state: initialRootState,
      });

      // Assert
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
