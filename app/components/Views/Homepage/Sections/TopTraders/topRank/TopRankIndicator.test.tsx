import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TopRankIndicator from './TopRankIndicator';

describe('TopRankIndicator', () => {
  it.each([1, 2, 3])(
    'colors the rank digit with the medal color for podium rank %s',
    (rank) => {
      renderWithProvider(<TopRankIndicator rank={rank} />);

      expect(
        screen.getByTestId(`top-rank-medal-color-${rank}`),
      ).toBeOnTheScreen();
      expect(screen.getByText(String(rank))).toBeOnTheScreen();
    },
  );

  it.each([0, 4, 19, 100])(
    'renders the plain rank digit for non-podium rank %s',
    (rank) => {
      renderWithProvider(<TopRankIndicator rank={rank} />);

      expect(screen.queryByTestId(/top-rank-medal-color-/)).toBeNull();
      expect(screen.getByText(String(rank))).toBeOnTheScreen();
    },
  );

  describe('podiumRank gating', () => {
    it('does not apply the podium color when the overall rank is outside the top 3 even if the displayed rank is 1', () => {
      renderWithProvider(<TopRankIndicator rank={1} podiumRank={19} />);

      expect(screen.queryByTestId('top-rank-medal-color-1')).toBeNull();
      expect(screen.queryByTestId('top-rank-medal-color-19')).toBeNull();
      expect(screen.getByText('1')).toBeOnTheScreen();
    });

    it('applies the podium color when the overall rank is in the top 3 even if the displayed rank is larger', () => {
      renderWithProvider(<TopRankIndicator rank={5} podiumRank={2} />);

      expect(screen.getByTestId('top-rank-medal-color-2')).toBeOnTheScreen();
      expect(screen.getByText('5')).toBeOnTheScreen();
    });
  });
});
