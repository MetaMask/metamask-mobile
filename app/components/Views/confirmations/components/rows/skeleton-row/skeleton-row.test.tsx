import React from 'react';
import { SkeletonRow } from './skeleton-row';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../component-library/components/Skeleton');

describe('SkeletonRow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const { getByTestId } = renderWithProvider(
      <SkeletonRow testId="skeleton-row" />,
      {
        state: {},
      },
    );

    expect(getByTestId('skeleton-row')).toBeDefined();
  });
});
