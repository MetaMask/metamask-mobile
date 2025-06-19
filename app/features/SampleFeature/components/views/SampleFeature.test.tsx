import React from 'react';
import { View } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SampleFeature from './SampleFeature';
import initialRootState from '../../../../util/test/initial-root-state';

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
 * Mock components using Jest's allowed mock-prefixed variables
 */
const MockView = View;

/**
 * Mock child components to isolate SampleFeature testing
 */
jest.mock('./SampleNetworkDisplay/SampleNetworkDisplay', () => ({
  SampleNetworkDisplay: () => <MockView testID="mocked-sample-network-display" />,
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
  /**
   * Verifies that the component renders correctly and matches the snapshot
   *
   * @test
   */
  it('matches rendered snapshot', () => {
    const { toJSON } = renderWithProvider(<SampleFeature />, {
      state: initialRootState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
