import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsRowSkeleton from './PerpsRowSkeleton';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';

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
          accessibilityLabel={`skeleton-${height}x${width}`}
        />
      )),
    };
  },
);

describe('PerpsRowSkeleton', () => {
  describe('rendering', () => {
    it('renders single skeleton row by default', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton />);

      const skeletons = getAllByLabelText(/skeleton-/);

      // 4 skeletons per row: icon, primary text, secondary text, value, label
      expect(skeletons).toHaveLength(5);
    });

    it('renders correct icon skeleton with default size', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton />);

      const iconSkeleton = getByLabelText(
        `skeleton-${HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE}x${HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE}`,
      );

      expect(iconSkeleton).toBeTruthy();
    });

    it('renders primary text skeleton', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton />);

      const primaryTextSkeleton = getByLabelText('skeleton-16x70%');

      expect(primaryTextSkeleton).toBeTruthy();
    });

    it('renders secondary text skeleton', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton />);

      const secondaryTextSkeleton = getByLabelText('skeleton-14x50%');

      expect(secondaryTextSkeleton).toBeTruthy();
    });

    it('renders value text skeleton', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton />);

      const valueTextSkeleton = getByLabelText('skeleton-16x80');

      expect(valueTextSkeleton).toBeTruthy();
    });

    it('renders label text skeleton', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton />);

      const labelTextSkeleton = getByLabelText('skeleton-14x60');

      expect(labelTextSkeleton).toBeTruthy();
    });
  });

  describe('count prop', () => {
    it('renders multiple skeleton rows when count is specified', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton count={3} />);

      const skeletons = getAllByLabelText(/skeleton-/);

      // 5 skeletons per row * 3 rows = 15
      expect(skeletons).toHaveLength(15);
    });

    it('renders no rows when count is zero', () => {
      const { queryAllByLabelText } = render(<PerpsRowSkeleton count={0} />);

      const skeletons = queryAllByLabelText(/skeleton-/);

      expect(skeletons).toHaveLength(0);
    });

    it('renders five skeleton rows', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton count={5} />);

      const skeletons = getAllByLabelText(/skeleton-/);

      // 5 skeletons per row * 5 rows = 25
      expect(skeletons).toHaveLength(25);
    });

    it('renders ten skeleton rows', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton count={10} />);

      const skeletons = getAllByLabelText(/skeleton-/);

      // 5 skeletons per row * 10 rows = 50
      expect(skeletons).toHaveLength(50);
    });
  });

  describe('iconSize prop', () => {
    it('renders icon skeleton with custom size', () => {
      const customSize = 48;

      const { getByLabelText } = render(
        <PerpsRowSkeleton iconSize={customSize} />,
      );

      const iconSkeleton = getByLabelText(
        `skeleton-${customSize}x${customSize}`,
      );

      expect(iconSkeleton).toBeTruthy();
    });

    it('renders small icon skeleton', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton iconSize={24} />);

      const iconSkeleton = getByLabelText('skeleton-24x24');

      expect(iconSkeleton).toBeTruthy();
    });

    it('renders large icon skeleton', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton iconSize={64} />);

      const iconSkeleton = getByLabelText('skeleton-64x64');

      expect(iconSkeleton).toBeTruthy();
    });
  });

  describe('style prop', () => {
    it('renders with custom style prop', () => {
      const customStyle = { backgroundColor: 'red', padding: 20 };

      const { getAllByLabelText } = render(
        <PerpsRowSkeleton style={customStyle} />,
      );

      // Verify the component renders successfully with style prop
      const skeletons = getAllByLabelText(/skeleton-/);
      expect(skeletons).toHaveLength(5);
    });
  });

  describe('edge cases', () => {
    it('handles negative count by rendering no rows', () => {
      const { queryAllByLabelText } = render(<PerpsRowSkeleton count={-1} />);

      const skeletons = queryAllByLabelText(/skeleton-/);

      expect(skeletons).toHaveLength(0);
    });

    it('handles fractional count by truncating to integer', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton count={2.7} />);

      const skeletons = getAllByLabelText(/skeleton-/);

      // 5 skeletons per row * 2 rows = 10 (truncates to 2)
      expect(skeletons).toHaveLength(10);
    });

    it('handles zero icon size', () => {
      const { getByLabelText } = render(<PerpsRowSkeleton iconSize={0} />);

      const iconSkeleton = getByLabelText('skeleton-0x0');

      expect(iconSkeleton).toBeTruthy();
    });

    it('combines count and iconSize props', () => {
      const { getAllByLabelText } = render(
        <PerpsRowSkeleton count={2} iconSize={50} />,
      );

      const allSkeletons = getAllByLabelText(/skeleton-/);
      const iconSkeletons = getAllByLabelText('skeleton-50x50');

      // Total: 5 skeletons per row * 2 rows = 10
      expect(allSkeletons).toHaveLength(10);
      // Icons: 1 icon per row * 2 rows = 2
      expect(iconSkeletons).toHaveLength(2);
    });
  });

  describe('structure', () => {
    it('renders rows with correct container structure', () => {
      const { getAllByTestId } = render(<PerpsRowSkeleton count={2} />);

      const skeletons = getAllByTestId('skeleton');

      // 5 skeletons per row * 2 rows = 10
      expect(skeletons.length).toBe(10);
    });
  });

  describe('accessibility', () => {
    it('renders skeletons with accessible labels', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton />);

      const skeletons = getAllByLabelText(/skeleton-/);

      skeletons.forEach((skeleton) => {
        expect(skeleton.props.accessibilityLabel).toMatch(/skeleton-\d+x/);
      });
    });
  });

  describe('consistent sizing', () => {
    it('maintains consistent text skeleton dimensions across multiple rows', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton count={3} />);

      const primaryTextSkeletons = getAllByLabelText('skeleton-16x70%');
      const secondaryTextSkeletons = getAllByLabelText('skeleton-14x50%');

      // Each row has one of each
      expect(primaryTextSkeletons).toHaveLength(3);
      expect(secondaryTextSkeletons).toHaveLength(3);
    });

    it('maintains consistent right section skeleton dimensions', () => {
      const { getAllByLabelText } = render(<PerpsRowSkeleton count={3} />);

      const valueSkeletons = getAllByLabelText('skeleton-16x80');
      const labelSkeletons = getAllByLabelText('skeleton-14x60');

      expect(valueSkeletons).toHaveLength(3);
      expect(labelSkeletons).toHaveLength(3);
    });
  });
});
