import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './EarnNetworkAvatar.styles';
import { useStyles } from '../../../../hooks/useStyles';
import NetworkAssetLogo from '../../../NetworkAssetLogo';

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

  return (
    <AvatarToken
      name={token.symbol}
      src={token.image ? { uri: token.image } : undefined}
      size={AvatarTokenSize.Md}
      twClassName="h-8 w-8 shrink-0"
      testID={`earn-token-avatar-${token.symbol}`}
    />
  );
};
