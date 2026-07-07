import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RankMedal, { isTopRank } from './RankMedal';

describe('isTopRank', () => {
  it.each([1, 2, 3])('returns true for podium rank %s', (rank) => {
    expect(isTopRank(rank)).toBe(true);
  });

  it.each([0, 4, 5, 100, -1])('returns false for rank %s', (rank) => {
    expect(isTopRank(rank)).toBe(false);
  });
});

describe('RankMedal', () => {
  it.each([1, 2, 3])('renders a medal for podium rank %s', (rank) => {
    render(<RankMedal rank={rank} />);

    expect(screen.getByTestId(`rank-medal-${rank}`)).toBeOnTheScreen();
  });

  it('sizes the medal from the size prop', () => {
    render(<RankMedal rank={2} size={30} />);

    expect(screen.getByTestId('rank-medal-2').props.height).toBe(30);
  });

  it.each([0, 4, 5, 100, -1])(
    'renders nothing for non-podium rank %s',
    (rank) => {
      render(<RankMedal rank={rank} testID="rank-medal-test" />);

      expect(screen.queryByTestId('rank-medal-test')).toBeNull();
    },
  );

  it('honors a custom testID', () => {
    render(<RankMedal rank={1} testID="custom-medal" />);

    expect(screen.getByTestId('custom-medal')).toBeOnTheScreen();
  });
});
