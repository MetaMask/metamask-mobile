import React from 'react';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './EarnNetworkAvatar.styles';
import { useStyles } from '../../../../hooks/useStyles';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import UsdcvIcon from '../../../../../images/usdcv-icon-2x.png';

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

  // USDcv uses a local icon asset (not yet available via API)
  if (token.symbol === 'USDcv') {
    return (
      <AvatarToken
        name={token.symbol}
        imageSource={UsdcvIcon}
        size={AvatarSize.Md}
        style={styles.networkAvatar}
        testID={`earn-token-avatar-${token.symbol}`}
      />
    );
  }

  return (
    <AvatarToken
      name={token.symbol}
      imageSource={{ uri: token.image }}
      size={AvatarSize.Md}
      style={styles.networkAvatar}
      testID={`earn-token-avatar-${token.symbol}`}
    />
  );
};
