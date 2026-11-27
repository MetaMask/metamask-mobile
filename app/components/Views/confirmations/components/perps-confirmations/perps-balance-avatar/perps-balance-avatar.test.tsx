import React from 'react';
import { render } from '@testing-library/react-native';
import { USDC_SYMBOL } from '@metamask/perps-controller';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
} from '@metamask/design-system-react-native';
import { PerpsBalanceAvatar } from './perps-balance-avatar';

describe('PerpsBalanceAvatar', () => {
  it.each([
    ['hyperliquid', 'Hyperliquid'],
    ['lighter', 'Lighter'],
  ] as const)('renders a USDC avatar badged with %s', (provider, badgeName) => {
    const { UNSAFE_getByType } = render(
      <PerpsBalanceAvatar provider={provider} />,
    );

    expect(UNSAFE_getByType(BadgeNetwork).props.name).toBe(badgeName);
    expect(UNSAFE_getByType(AvatarToken).props).toEqual(
      expect.objectContaining({
        name: USDC_SYMBOL,
        size: AvatarTokenSize.Md,
      }),
    );
  });

  it('passes the size to the token avatar', () => {
    const { UNSAFE_getByType } = render(
      <PerpsBalanceAvatar provider="lighter" size={AvatarTokenSize.Sm} />,
    );

    expect(UNSAFE_getByType(AvatarToken).props.size).toBe(AvatarTokenSize.Sm);
  });
});
