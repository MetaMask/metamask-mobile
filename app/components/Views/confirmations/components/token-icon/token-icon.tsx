import React from 'react';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import { Hex } from '@metamask/utils';
import BaseTokenIcon from '../../../../Base/TokenIcon';
import styleSheet from './token-icon.styles';
import { useStyles } from '../../../../hooks/useStyles';
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
      position={BadgeWrapperPosition.BottomRight}
      badge={
        showNetwork && networkImageSource ? (
          <BadgeNetwork
            src={networkImageSource}
            testID="token-icon-network-badge"
          />
        ) : null
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
