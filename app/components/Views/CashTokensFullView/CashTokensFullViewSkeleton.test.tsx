import React from 'react';
import { render } from '@testing-library/react-native';
import CashTokensFullViewSkeleton, {
  CashTokensFullViewSkeletonTestIds,
} from './CashTokensFullViewSkeleton';

describe('CashTokensFullViewSkeleton', () => {
  it('renders the skeleton container', () => {
    const { getByTestId } = render(<CashTokensFullViewSkeleton />);
    expect(
      getByTestId(CashTokensFullViewSkeletonTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(<CashTokensFullViewSkeleton />);
    expect(toJSON()).toMatchSnapshot();
  });
});
