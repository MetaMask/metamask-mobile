import React from 'react';
import { isCaipChainId, isStrictHexString } from '@metamask/utils';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { TokenI } from '../../../Tokens/types';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import { getAssetImageUrl } from '../../../Bridge/hooks/useAssetMetadata/utils';
import styleSheet from './AssetLogo.styles';

const getFallbackAssetImageUrl = (asset: TokenI): string | undefined => {
  if (!asset.chainId) {
    return undefined;
  }

  if (!isCaipChainId(asset.chainId) && !isStrictHexString(asset.chainId)) {
    return undefined;
  }

  return getAssetImageUrl(asset.address, asset.chainId);
};

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

  const imageUri = asset.image || getFallbackAssetImageUrl(asset);

  return (
    <AvatarToken
      name={asset.symbol}
      imageSource={imageUri ? { uri: imageUri } : undefined}
      size={AvatarSize.Lg}
    />
  );
};

export default AssetLogo;
