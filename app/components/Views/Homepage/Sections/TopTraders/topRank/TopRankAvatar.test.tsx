import { screen } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TopRankAvatar from './TopRankAvatar';

const renderAvatar = () =>
  renderWithProvider(
    <TopRankAvatar>
      <View testID="avatar-child">
        <Text>A</Text>
      </View>
    </TopRankAvatar>,
  );

describe('TopRankAvatar', () => {
  it('passes children through unchanged with no rank decoration', () => {
    renderAvatar();

    expect(screen.getByTestId('avatar-child')).toBeOnTheScreen();
    expect(screen.queryByTestId(/top-rank-/)).not.toBeOnTheScreen();
  });
});
