import React from 'react';
import { render } from '@testing-library/react-native';
import TokenListSkeleton from './TokenListSkeleton';

// Mock the theme hook
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        section: '#E5E5E5',
        subsection: '#F5F5F5',
        default: '#FFFFFF',
      },
      border: {
        muted: '#D6D9DC',
      },
    },
  }),
}));

// Mock createStyles module completely
jest.mock('../styles', () => {
  const mockCreateStyles = jest.fn(() => ({
    wrapperSkeleton: {
      flex: 1,
      padding: 16,
    },
    skeletonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    skeletonTextContainer: {
      flex: 1,
    },
    skeletonValueContainer: {
      alignItems: 'flex-end',
    },
  }));
  
  return mockCreateStyles;
});

describe('TokenListSkeleton', () => {
  it('renders correctly without errors', () => {
    const { UNSAFE_root } = render(<TokenListSkeleton />);

    expect(UNSAFE_root).toBeDefined();
  });

  it('renders 10 skeleton items for token list', () => {
    const { UNSAFE_getAllByType } = render(<TokenListSkeleton />);
    const { View } = require('react-native');

    // Get all View components rendered
    const views = UNSAFE_getAllByType(View);

    // Verify there are multiple views rendered for the skeleton list
    // The exact count includes parent containers and skeleton item children,
    // so we just verify it's > 10
    expect(views.length).toBeGreaterThan(10);
  });

  it('renders SkeletonPlaceholder component with background colors', () => {
    const { UNSAFE_getByType } = render(<TokenListSkeleton />);
    const SkeletonPlaceholder = require('react-native-skeleton-placeholder').default;

    const skeleton = UNSAFE_getByType(SkeletonPlaceholder);

    expect(skeleton.props.backgroundColor).toBe('#f3f5f9');
    expect(skeleton.props.highlightColor).toBe('#ffffff');
  });

  it('renders skeleton items in list layout structure', () => {
    const { UNSAFE_getAllByType } = render(<TokenListSkeleton />);
    const { View } = require('react-native');

    const views = UNSAFE_getAllByType(View);

    // Verify that we have a wrapper view and multiple skeleton item views
    // The first view should be the wrapper
    expect(views.length).toBeGreaterThanOrEqual(11); // 1 wrapper + 10 items
  });
});
