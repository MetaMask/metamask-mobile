import React from 'react';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './EarnNetworkAvatar.styles';
import { useStyles } from '../../../../hooks/useStyles';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { AvatarTokenSize } from '@metamask/design-system-react-native';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';

interface EarnNetworkAvatarProps {
  token: TokenI;
}

export const EarnNetworkAvatar = ({ token }: EarnNetworkAvatarProps) => {
  const { styles } = useStyles(styleSheet, {});

  if (token.isNative) {
    return (
      <NetworkAssetLogo
        chainId={token.chainId ?? ''}
        style={styles.networkAvatar}
        ticker={token.ticker ?? ''}
        big={false}
        biggest
        testID={`earn-token-list-item-${token.symbol}-${token.chainId}`}
      />
    );
  }

  // `AssetLogo` (not a bare `AvatarToken`) so tokens whose `TokensController`
  // entry carries no `image` still render an icon from the CDN fallback.
  return (
    <AssetLogo
      asset={token}
      size={AvatarTokenSize.Md}
      testID={`earn-token-avatar-${token.symbol}`}
    />
  );
};
