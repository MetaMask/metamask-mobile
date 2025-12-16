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
  it('renders without errors', () => {
    const { root } = render(<TokenListSkeleton />);

    expect(root).toBeDefined();
  });
});
