import React from 'react';
import { render } from '@testing-library/react-native';
import SiteSkeleton from './SiteSkeleton';

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

describe('SiteSkeleton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders successfully with default props', () => {
      const { getAllByTestId } = render(<SiteSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      // Should render 3 skeleton elements: logo, site name, display URL
      expect(skeletons.length).toBe(3);
    });

    it('renders logo skeleton with correct dimensions', () => {
      const { getAllByTestId } = render(<SiteSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      const logoSkeleton = skeletons[0];
      expect(logoSkeleton.props.style).toContainEqual({
        height: 40,
        width: 40,
      });
    });

    it('renders name skeleton with correct dimensions', () => {
      const { getAllByTestId } = render(<SiteSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      const nameSkeleton = skeletons[1];
      expect(nameSkeleton.props.style).toContainEqual({
        height: 20,
        width: '60%',
      });
    });

    it('renders URL skeleton with correct dimensions', () => {
      const { getAllByTestId } = render(<SiteSkeleton />);

      const skeletons = getAllByTestId('skeleton');
      const urlSkeleton = skeletons[2];
      expect(urlSkeleton.props.style).toContainEqual({
        height: 16,
        width: '40%',
      });
    });
  });

  describe('padding behavior', () => {
    it('applies horizontal padding when isViewAll is true', () => {
      const { getByTestId } = render(<SiteSkeleton isViewAll />);

      const container = getByTestId('skeleton').parent;
      expect(container?.props.style).toContainEqual({ paddingHorizontal: 8 });
    });

    it('does not apply horizontal padding when isViewAll is false', () => {
      const { getByTestId } = render(<SiteSkeleton isViewAll={false} />);

      const container = getByTestId('skeleton').parent;
      const styles = Array.isArray(container?.props.style)
        ? container?.props.style
        : [container?.props.style];
      const hasPaddingHorizontal = styles.some(
        (style: { paddingHorizontal?: number }) =>
          style?.paddingHorizontal === 8,
      );
      expect(hasPaddingHorizontal).toBe(false);
    });

    it('does not apply horizontal padding when isViewAll is not provided', () => {
      const { getByTestId } = render(<SiteSkeleton />);

      const container = getByTestId('skeleton').parent;
      const styles = Array.isArray(container?.props.style)
        ? container?.props.style
        : [container?.props.style];
      const hasPaddingHorizontal = styles.some(
        (style: { paddingHorizontal?: number }) =>
          style?.paddingHorizontal === 8,
      );
      expect(hasPaddingHorizontal).toBe(false);
    });
  });

  it('matches snapshot with default props', () => {
    const { toJSON } = render(<SiteSkeleton />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with isViewAll prop', () => {
    const { toJSON } = render(<SiteSkeleton isViewAll />);

    expect(toJSON()).toMatchSnapshot();
  });
});
