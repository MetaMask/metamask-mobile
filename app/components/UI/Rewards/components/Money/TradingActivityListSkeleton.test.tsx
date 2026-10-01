import React from 'react';
import { render } from '@testing-library/react-native';
import TradingActivityListSkeleton, {
  TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS,
} from './TradingActivityListSkeleton';

describe('TradingActivityListSkeleton', () => {
  it('renders the requested number of activity rows', () => {
    const { getAllByTestId } = render(<TradingActivityListSkeleton rows={5} />);

    expect(
      getAllByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.ROW),
    ).toHaveLength(5);
  });

  it('fills the given height when no row count is given', () => {
    const { getAllByTestId } = render(
      <TradingActivityListSkeleton height={280} />,
    );

    expect(
      getAllByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.ROW),
    ).toHaveLength(5);
  });
});
