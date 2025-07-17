import React from 'react';
import { View } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SampleFeature from './SampleFeature';
import initialRootState from '../../../../util/test/initial-root-state';
import { selectSampleFeatureCounterEnabled } from '../../selectors/sampleFeatureCounter';

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
 * Mock components using Jest's allowed mock-prefixed variables
 */
const MockView = View;

/**
 * Mock child components to isolate SampleFeature testing
 */
jest.mock('./SampleNetworkDisplay/SampleNetworkDisplay', () => ({
  SampleNetworkDisplay: () => (
    <MockView testID="mocked-sample-network-display" />
  ),
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Verifies that the component renders correctly when feature flag is enabled
   *
   * @test
   */
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

  /**
   * Verifies that the component renders correctly when feature flag is disabled
   *
   * @test
   */
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
