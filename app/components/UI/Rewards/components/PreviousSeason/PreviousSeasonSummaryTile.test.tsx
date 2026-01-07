import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import PreviousSeasonSummaryTile from './PreviousSeasonSummaryTile';
import { SkeletonProps } from '../../../../../component-library/components/Skeleton';

// Mock Skeleton
jest.mock('../../../../../component-library/components/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    Skeleton: ({ style, ...props }: SkeletonProps) =>
      ReactActual.createElement(View, {
        testID: 'skeleton',
        style,
        ...props,
      }),
  };
});

describe('PreviousSeasonSummaryTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when not loading', () => {
    const { getByText } = render(
      <PreviousSeasonSummaryTile>
        <Text>Test Content</Text>
      </PreviousSeasonSummaryTile>,
    );

    expect(getByText('Test Content')).toBeOnTheScreen();
  });

  it('renders skeleton when loading', () => {
    const { getByTestId, queryByText } = render(
      <PreviousSeasonSummaryTile isLoading>
        <Text>Test Content</Text>
      </PreviousSeasonSummaryTile>,
    );

    expect(getByTestId('skeleton')).toBeOnTheScreen();
    expect(queryByText('Test Content')).toBeNull();
  });

  it('uses default loading height when not provided', () => {
    const { getByTestId } = render(
      <PreviousSeasonSummaryTile isLoading loadingHeight={undefined}>
        <Text>Test</Text>
      </PreviousSeasonSummaryTile>,
    );

    const skeleton = getByTestId('skeleton');
    expect(skeleton).toBeOnTheScreen();
  });

  it('uses custom loading height when provided', () => {
    const { getByTestId } = render(
      <PreviousSeasonSummaryTile isLoading loadingHeight={200}>
        <Text>Test</Text>
      </PreviousSeasonSummaryTile>,
    );

    const skeleton = getByTestId('skeleton');
    expect(skeleton).toBeOnTheScreen();
  });

  it('renders multiple children when not loading', () => {
    const { getByText } = render(
      <PreviousSeasonSummaryTile>
        <Text>Child 1</Text>
        <Text>Child 2</Text>
      </PreviousSeasonSummaryTile>,
    );

    expect(getByText('Child 1')).toBeOnTheScreen();
    expect(getByText('Child 2')).toBeOnTheScreen();
  });
});
