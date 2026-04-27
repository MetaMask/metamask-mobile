import React from 'react';
import {
  Box,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { TokenI } from '../../../Tokens/types';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import styleSheet from './AssetLogo.styles';

const AssetLogo = ({ asset }: { asset: TokenI }) => {
  const { styles } = useStyles(styleSheet, {});

  if (asset.isNative) {
    return (
      <NetworkAssetLogo
        chainId={asset.chainId as string}
        style={styles.ethLogo}
        ticker={asset.ticker ?? asset.symbol}
        big={false}
        biggest={false}
        testID={asset.name}
      />
    );
  }

  return (
    <AvatarToken
      name={asset.symbol}
      src={{ uri: asset.image }}
      size={AvatarTokenSize.Lg}
      testID="token-avatar-image"
    />
  );
};

export default AssetLogo;
