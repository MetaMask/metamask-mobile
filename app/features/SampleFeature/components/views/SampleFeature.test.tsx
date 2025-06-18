import React from 'react';
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
