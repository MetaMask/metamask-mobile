import React from 'react';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
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
      imageSource={{ uri: asset.image }}
      size={AvatarSize.Lg}
    />
  );
};

export default AssetLogo;
