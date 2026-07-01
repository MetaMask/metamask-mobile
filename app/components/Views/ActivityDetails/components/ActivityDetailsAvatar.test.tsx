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

  it('shows a "?" fallback for a token whose image cannot be resolved', () => {
    const { getByText } = renderWithProvider(
      <ActivityDetailsAvatar
        tokens={[{ symbol: 'BTZ', direction: 'out' } as TokenAmount]}
        size={AvatarTokenSize.Lg}
      />,
    );

    expect(getByText('?')).toBeOnTheScreen();
  });
});
