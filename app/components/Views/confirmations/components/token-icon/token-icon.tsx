import React from 'react';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
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
import { getAssetImageUrl } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';

export interface TokenIconProps {
  address: Hex;
  chainId: Hex;
  showNetwork?: boolean;
  symbol?: string;
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
  symbol: symbolProp,
  variant = TokenIconVariant.Default,
}) => {
  const { styles } = useStyles(styleSheet, { variant });

  const token = useTokenWithBalance(address, chainId);
  const symbol = token?.symbol ?? symbolProp;

  if (!token && !symbol) {
    return null;
  }

  const icon = token?.image ?? getTokenIconUrl(address, chainId);

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
      <BaseTokenIcon
        testID="token-icon"
        icon={icon}
        symbol={symbol}
        style={styles.tokenIcon}
      />
    </BadgeWrapper>
  );
};

function getTokenIconUrl(address: Hex, chainId: Hex) {
  if (address.toLowerCase() === getNativeTokenAddress(chainId).toLowerCase()) {
    return undefined;
  }

  return getAssetImageUrl(address, chainId);
}
