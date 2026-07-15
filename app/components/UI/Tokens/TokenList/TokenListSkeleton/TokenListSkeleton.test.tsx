import React from 'react';
import { render } from '@testing-library/react-native';
import TokenListSkeleton from './TokenListSkeleton';

// Mock the theme hook
jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

describe('TokenListSkeleton', () => {
  it('renders without errors', () => {
    const { root } = render(<TokenListSkeleton />);

    expect(root).toBeDefined();
  });
});
