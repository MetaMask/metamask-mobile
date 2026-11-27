import React from 'react';
import { USDC_SYMBOL, USDC_TOKEN_ICON_URL } from '@metamask/perps-controller';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
} from '@metamask/design-system-react-native';
import LighterLogo from 'images/lighter.svg';
import type { SvgProps } from 'react-native-svg';

import images from '../../../../../../images/image-icons';
import type { PerpsProviderSelection } from '../../../utils/perps-lighter-transaction-type';

// Bundled images resolve to a numeric asset id.
const HYPERLIQUID_BADGE_SRC = images.HYPE as number;

// The SVG import requires a `name` prop; the design-system badge does not pass one.
const LighterBadgeSrc = (props: SvgProps) => (
  <LighterLogo {...props} name="Lighter" />
);

const PROVIDER_NAME: Record<PerpsProviderSelection, string> = {
  hyperliquid: 'Hyperliquid',
  lighter: 'Lighter',
};

/**
 * USDC avatar badged with the Perps provider whose balance it represents.
 */
export function PerpsBalanceAvatar({
  provider,
  size = AvatarTokenSize.Md,
}: {
  provider: PerpsProviderSelection;
  size?: AvatarTokenSize;
}) {
  return (
    <BadgeWrapper
      badge={
        <BadgeNetwork
          name={PROVIDER_NAME[provider]}
          src={
            provider === 'hyperliquid' ? HYPERLIQUID_BADGE_SRC : LighterBadgeSrc
          }
        />
      }
    >
      <AvatarToken
        name={USDC_SYMBOL}
        src={{ uri: USDC_TOKEN_ICON_URL }}
        size={size}
      />
    </BadgeWrapper>
  );
}
