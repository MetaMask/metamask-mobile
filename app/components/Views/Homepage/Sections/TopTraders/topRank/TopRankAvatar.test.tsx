import React from 'react';
import { Text, View } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TopRankAvatar from './TopRankAvatar';

const renderWithRank = (rank: number) =>
  renderWithProvider(
    <TopRankAvatar rank={rank}>
      <View testID="avatar-child">
        <Text>A</Text>
      </View>
    </TopRankAvatar>,
  );

describe('TopRankAvatar', () => {
  it.each([1, 2, 3])(
    'wraps the avatar with a gradient ring and floating crown for rank %s',
    (rank) => {
      const { getByTestId } = renderWithRank(rank);

      expect(getByTestId(`top-rank-gradient-ring-${rank}`)).toBeTruthy();
      expect(getByTestId(`top-rank-crown-${rank}`)).toBeTruthy();
      expect(getByTestId('avatar-child')).toBeTruthy();
    },
  );

  it.each([0, 4, 5, 19, 100])(
    'passes children through unchanged for non-podium rank %s',
    (rank) => {
      const { getByTestId, queryByTestId } = renderWithRank(rank);

      expect(getByTestId('avatar-child')).toBeTruthy();
      expect(queryByTestId(/top-rank-/)).toBeNull();
    },
  );
});
