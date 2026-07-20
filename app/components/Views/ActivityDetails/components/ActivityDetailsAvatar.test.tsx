import React from 'react';
import { AvatarTokenSize } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { TokenAmount } from '../../../../util/activity-adapters';
import { ActivityDetailsAvatar } from './ActivityDetailsAvatar';

describe('ActivityDetailsAvatar', () => {
  it('renders nothing when there are no tokens and no icon url', () => {
    const { toJSON } = renderWithProvider(
      <ActivityDetailsAvatar tokens={[]} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('shows the first letter of the token symbol when the image cannot be resolved', () => {
    const { getByText, queryByText } = renderWithProvider(
      <ActivityDetailsAvatar
        tokens={[
          { symbol: 'Playful Primates', direction: 'out' } as TokenAmount,
        ]}
        size={AvatarTokenSize.Lg}
      />,
    );

    expect(getByText('P')).toBeOnTheScreen();
    expect(queryByText('?')).toBeNull();
  });

  it('shows a "?" fallback when the token has no symbol and no image', () => {
    const { getByText } = renderWithProvider(
      <ActivityDetailsAvatar
        tokens={[{ direction: 'out' } as TokenAmount]}
        size={AvatarTokenSize.Lg}
      />,
    );

    expect(getByText('?')).toBeOnTheScreen();
  });
});
