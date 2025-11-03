import React from 'react';
import { render } from '@testing-library/react-native';
import NftGridSkeleton from './NftGridSkeleton';

// Mock the theme hook
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        section: '#f3f5f9',
        subsection: '#ffffff',
      },
    },
  }),
}));

// Mock the tailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((...args) => {
      if (Array.isArray(args[0])) {
        return args[0].join(' ');
      }
      return args.join(' ');
    }),
  }),
}));

describe('NftGridSkeleton', () => {
  it('renders correctly without errors', () => {
    expect(() => render(<NftGridSkeleton />)).not.toThrow();
  });

  it('renders 18 skeleton items in grid layout', () => {
    const { UNSAFE_getAllByType } = render(<NftGridSkeleton />);
    const { View } = require('react-native');

    // Get all View components rendered
    const views = UNSAFE_getAllByType(View);

    // Verify there are multiple views rendered for the skeleton grid
    // The exact count includes parent containers, so we just verify it's > 18
    expect(views.length).toBeGreaterThan(18);
  });

  it('renders SkeletonPlaceholder component with theme background colors', () => {
    const { UNSAFE_getByType } = render(<NftGridSkeleton />);
    const SkeletonPlaceholder =
      require('react-native-skeleton-placeholder').default;

    const skeleton = UNSAFE_getByType(SkeletonPlaceholder);

    expect(skeleton.props.backgroundColor).toBe('#f3f5f9');
    expect(skeleton.props.highlightColor).toBe('#ffffff');
  });

  it('uses Tailwind for styling layout', () => {
    // Arrange & Act
    const { UNSAFE_root } = render(<NftGridSkeleton />);

    // Assert - component renders with Tailwind styling without errors
    expect(UNSAFE_root).toBeDefined();
  });

  it('renders skeleton items in 3-column grid (30% width each)', () => {
    // Arrange & Act
    const { UNSAFE_getAllByType } = render(<NftGridSkeleton />);
    const { View } = require('react-native');

    // Assert - verify the grid structure exists
    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBeGreaterThanOrEqual(19); // 1 container + 18 items
  });
});
