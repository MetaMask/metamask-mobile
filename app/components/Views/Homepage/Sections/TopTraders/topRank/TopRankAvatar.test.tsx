import { screen } from '@testing-library/react-native';
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
  it.each([1, 2, 3, 4, 5, 100])(
    'passes children through unchanged for rank %s',
    (rank) => {
      renderWithRank(rank);

      expect(screen.getByTestId('avatar-child')).toBeOnTheScreen();
      expect(screen.queryByTestId(/top-rank-/)).not.toBeOnTheScreen();
    },
  );
});
