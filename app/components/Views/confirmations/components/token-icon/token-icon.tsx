import React from 'react';
import { Hex } from '@metamask/utils';
import SwapsTokenIcon from '../../../../UI/Swaps/components/TokenIcon';
import styleSheet from './token-icon.styles';
import { useStyles } from '../../../../hooks/useStyles';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useTokenWithBalance } from '../../hooks/tokens/useTokenWithBalance';

export interface TokenIconProps {
  address: Hex;
  chainId: Hex;
  showNetwork?: boolean;
  variant?: TokenIconVariant;
}

export enum TokenIconVariant {
  Default = 'default',
  Row = 'row',
  Hero = 'hero',
}

export const TokenIcon: React.FC<TokenIconProps> = ({
  address,
  chainId,
  showNetwork = true,
  variant = TokenIconVariant.Default,
}) => {
  const { styles } = useStyles(styleSheet, { variant });

  const token = useTokenWithBalance(address, chainId);

  if (!token) {
    return null;
  }

  const networkImageSource = getNetworkImageSource({
    chainId,
  });

  return (
    <BadgeWrapper
      style={styles.container}
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        showNetwork && (
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkImageSource}
            style={styles.badge}
          />
        )
      }
    >
      <SwapsTokenIcon
        testID="token-icon"
        icon={token?.image}
        symbol={token?.symbol}
        style={styles.tokenIcon}
      />
    </BadgeWrapper>
  );
};
