import React from 'react';
import { render } from '@testing-library/react-native';
import TrendingTokensSkeleton from './TrendingTokensSkeleton';

// Mock Skeleton component
jest.mock(
  '../../../../../component-library/components/Skeleton/Skeleton',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: jest.fn(({ height, width, style, testID }) => (
        <ReactNative.View
          testID={testID || 'skeleton'}
          style={[{ height, width }, style]}
        />
      )),
    };
  },
);

describe('TrendingTokensSkeleton', () => {
  it('renders successfully with default props', () => {
    const { getAllByTestId } = render(<TrendingTokensSkeleton />);
    const skeletons = getAllByTestId('skeleton');
    // Should render 5 skeleton elements: icon, token name, market stats, price, percentage
    expect(skeletons.length).toBe(5);
  });

  it('renders single skeleton row by default', () => {
    const { getAllByTestId } = render(<TrendingTokensSkeleton />);
    const skeletons = getAllByTestId('skeleton');
    // Should render 5 skeleton elements for one row
    expect(skeletons.length).toBe(5);
  });

  it('renders multiple skeleton rows when count is provided', () => {
    const { getAllByTestId } = render(<TrendingTokensSkeleton count={3} />);
    const skeletons = getAllByTestId('skeleton');
    // Should render 5 skeleton elements per row (3 rows = 15 skeletons)
    expect(skeletons.length).toBe(15);
  });
});
