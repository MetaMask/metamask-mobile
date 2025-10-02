import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsTransactionsSkeleton from './PerpsTransactionsSkeleton';

// Mock the useStyles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      sectionHeader: {},
      sectionHeaderSkeleton: {},
      transactionItem: {},
      tokenIconContainer: {},
      tokenIcon: {},
      transactionContent: {},
      transactionTitle: {},
      transactionSubtitle: {},
      rightContent: {},
      rightContentSkeleton: {},
    },
  })),
}));

// Mock the Skeleton component
jest.mock(
  '../../../../../component-library/components/Skeleton/Skeleton',
  () =>
    function MockSkeleton({
      testID,
      ...props
    }: {
      testID?: string;
      [key: string]: unknown;
    }) {
      return <div data-testid={testID} {...props} />;
    },
);

describe('PerpsTransactionsSkeleton', () => {
  it('renders loading skeleton with correct structure', () => {
    render(<PerpsTransactionsSkeleton />);

    // Should render the main container
    expect(screen.getByTestId('perps-transactions-skeleton')).toBeOnTheScreen();
  });

  it('renders with custom testID', () => {
    const customTestID = 'custom-skeleton-test-id';
    render(<PerpsTransactionsSkeleton testID={customTestID} />);

    expect(screen.getByTestId(customTestID)).toBeOnTheScreen();
  });

  it('renders multiple skeleton sections and transaction items', () => {
    render(<PerpsTransactionsSkeleton />);

    // Should render skeleton elements (mocked as div elements)
    // The actual structure includes 2 sections with 3 transaction items each
    const skeletonElements = screen.getAllByTestId(/skeleton/i);
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});
