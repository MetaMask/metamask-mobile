import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import networkImage from '../../../../images/ethereum.png';
import { SampleNetworkDisplay } from './SampleNetworkDisplay';

/**
 * Test suite for SampleNetworkDisplay component
 *
 * @group Components
 * @group SampleNetworkDisplay
 */
describe('SampleNetworkDisplay', () => {
  /**
   * Verifies that the component renders correctly and matches the snapshot
   * Tests the component with a sample network name and image
   *
   * @test
   */
  it('matches rendered snapshot', () => {
    const { toJSON } = renderWithProvider(
      <SampleNetworkDisplay
        name={'My test network'}
        imageSource={networkImage}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
