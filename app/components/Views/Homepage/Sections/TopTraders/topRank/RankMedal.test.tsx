import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RankMedal from './RankMedal';

describe('RankMedal', () => {
  it.each([1, 2, 3])('renders a medal for podium rank %s', (rank) => {
    render(<RankMedal rank={rank} />);

    expect(screen.getByTestId(`rank-medal-${rank}`)).toBeOnTheScreen();
  });

  it('renders the rank numeral on the medallion', () => {
    const { toJSON } = render(<RankMedal rank={2} />);

    expect(JSON.stringify(toJSON())).toContain('"2"');
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
