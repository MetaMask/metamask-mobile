import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RewardsTabSkeleton, {
  REWARDS_TAB_SKELETON_TEST_IDS,
} from './RewardsTabSkeleton';

describe('RewardsTabSkeleton', () => {
  it('renders the header row and the card body inside the safe area', () => {
    render(<RewardsTabSkeleton />);

    expect(
      screen.getByTestId(REWARDS_TAB_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(REWARDS_TAB_SKELETON_TEST_IDS.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(REWARDS_TAB_SKELETON_TEST_IDS.BODY),
    ).toBeOnTheScreen();
  });

  it('applies the default background so the tab does not flash an untinted screen', () => {
    render(<RewardsTabSkeleton />);

    const container = screen.getByTestId(
      REWARDS_TAB_SKELETON_TEST_IDS.CONTAINER,
    );

    expect(container.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: expect.any(String),
        flexGrow: 1,
      }),
    );
  });
});
