import React, { useMemo } from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import type { TokenI } from '../../../Tokens/types';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import styleSheet from './AssetLogo.styles';
import { getFallbackAssetImageUrls } from './AssetLogo.utils';
import { useSmartImageFallback } from './AssetLogo.hook';

type AssetLogoAsset = Omit<TokenI, 'balance'>;

const AssetLogo = ({
  asset,
  size = AvatarTokenSize.Lg,
  testID,
}: {
  asset: AssetLogoAsset;
  size?: AvatarTokenSize;
  testID?: string;
}) => {
  const { styles } = useStyles(styleSheet, {});

  const images = useMemo(
    () =>
      [
        asset.image,
        ...(getFallbackAssetImageUrls(asset.chainId, asset.address) ?? []),
      ]
        .filter((image): image is string => Boolean(image))
        .map((image) => ({ uri: image })),
    [asset.image, asset.chainId, asset.address],
  );
  const { source, onError, uniqueSourceImageKey } =
    useSmartImageFallback(images);

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
      key={uniqueSourceImageKey}
      name={asset.symbol}
      src={source}
      imageOrSvgProps={{
        imageProps: { onError, testID: 'token-avatar-image' },
      }}
      size={size}
      testID={testID}
    />
  );
};

export default AssetLogo;
