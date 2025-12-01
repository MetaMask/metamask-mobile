import React from 'react';
import { render } from '@testing-library/react-native';
import TrendingTokensSkeleton from './TrendingTokensSkeleton';

// Mock Skeleton component
jest.mock(
  '../../../../../component-library/components/Skeleton/Skeleton',
  () => {
    const ReactNative = jest.requireActual('react-native');
    const SkeletonMock = ({
      height,
      width,
      style,
    }: {
      height?: number;
      width?: number | string;
      style?: object;
    }) => (
      <ReactNative.View testID="skeleton" style={[{ height, width }, style]} />
    );
    return {
      __esModule: true,
      default: SkeletonMock,
    };
  },
);

describe('TrendingTokensSkeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders successfully with default props', () => {
      const { getAllByTestId } = render(<TrendingTokensSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      expect(skeletons.length).toBe(5);
    });

    it('renders logo skeleton with correct dimensions', () => {
      const { getAllByTestId } = render(<TrendingTokensSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      const logoSkeleton = skeletons[0];

      expect(logoSkeleton.props.style).toEqual([
        { height: 40, width: 40 },
        { borderRadius: 100 },
      ]);
    });

    it('renders name skeleton with correct dimensions', () => {
      const { getAllByTestId } = render(<TrendingTokensSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      const nameSkeleton = skeletons[1];

      expect(nameSkeleton.props.style).toContainEqual({
        height: 20,
        width: '60%',
      });
    });

    it('renders URL skeleton with correct dimensions', () => {
      const { getAllByTestId } = render(<TrendingTokensSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      const urlSkeleton = skeletons[2];

      expect(urlSkeleton.props.style).toEqual([
        { height: 18, width: '80%' },
        { marginBottom: 0, marginTop: 2 },
      ]);
    });
  });
});
