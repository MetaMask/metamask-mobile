import React, { useMemo, useRef } from 'react';
import { Hex } from '@metamask/utils';
import BaseTokenIcon from '../../../../Base/TokenIcon';
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

interface TokenIconVisualProps {
  chainId: Hex;
  showNetwork: boolean;
  variant: TokenIconVariant;
  image?: string;
  symbol?: string;
}

const TokenIconVisual = React.memo(({
  chainId,
  showNetwork,
  variant,
  image,
  symbol,
}: TokenIconVisualProps) => {
  const { styles } = useStyles(styleSheet, { variant });

  const networkImageSource = useMemo(
    () => getNetworkImageSource({ chainId }),
    [chainId],
  );

  const badgeElement = useMemo(
    () =>
      showNetwork ? (
        <Badge
          variant={BadgeVariant.Network}
          imageSource={networkImageSource}
          style={styles.badge}
        />
      ) : undefined,
    [showNetwork, networkImageSource, styles.badge],
  );

  return (
    <BadgeWrapper
      style={styles.container}
      badgePosition={BadgePosition.BottomRight}
      badgeElement={badgeElement}
    >
      <BaseTokenIcon
        testID="token-icon"
        icon={image}
        symbol={symbol}
        style={styles.tokenIcon}
      />
    </BadgeWrapper>
  );
});

export const TokenIcon: React.FC<TokenIconProps> = ({
  address,
  chainId,
  showNetwork = true,
  variant = TokenIconVariant.Default,
}) => {
  const token = useTokenWithBalance(address, chainId);
  const lastTokenRef = useRef(token);

  if (token) {
    lastTokenRef.current = token;
  }

  const displayToken = token ?? lastTokenRef.current;

  if (!displayToken) {
    return null;
  }

  return (
    <TokenIconVisual
      chainId={chainId}
      showNetwork={showNetwork}
      variant={variant}
      image={displayToken.image}
      symbol={displayToken.symbol}
    />
  );
};
