import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { useSmartImageFallback } from '../../../../../../UI/Assets/components/AssetLogo/AssetLogo.hook';
import { getFallbackAssetImageUrls } from '../../../../../../UI/Assets/components/AssetLogo/AssetLogo.utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { getBridgeTokenImageSource } from '../getBridgeTokenImageSource';

export const QUICK_BUY_TOKEN_ICON_AVATAR_TEST_ID =
  'quick-buy-token-icon-avatar';

const styles = StyleSheet.create({
  badgeWrapper: {
    // Override BadgeWrapper's alignSelf: 'flex-start' so the parent row keeps
    // controlling the vertical alignment (same as Bridge's TokenSelectorItem).
    alignSelf: undefined,
  },
});

interface QuickBuyTokenIconProps {
  token: BridgeToken;
  size?: AvatarTokenSize;
}

/**
 * Token avatar with a network badge for the Quick Buy sheet.
 *
 * Mirrors the homepage Token list rendering (`TokenListItem` + `AssetLogo`):
 * a fully round `AvatarToken` resolved from the token image with the shared
 * static-CDN fallbacks (`getFallbackAssetImageUrls` + `useSmartImageFallback`),
 * and a circular network badge scaled to half the avatar via the
 * component-library `BadgeWrapper`/`Badge` pair, sourced from
 * `getNetworkImageSource`.
 */
const QuickBuyTokenIcon: React.FC<QuickBuyTokenIconProps> = ({
  token,
  size = AvatarTokenSize.Md,
}) => {
  const networkImageSource = getNetworkImageSource({
    chainId: token.chainId,
  });

  // Same data sources as the homepage Token list (`AssetLogo`): the token's
  // own image first, then the static-CDN fallbacks (lowercased + checksummed
  // address variants). `getBridgeTokenImageSource` keeps native assets working
  // by resolving their canonical SLIP-44 asset-id icon.
  const bridgeImageUri = getBridgeTokenImageSource(token)?.uri;
  const images = useMemo(() => {
    const urls = [
      token.image,
      bridgeImageUri,
      ...(getFallbackAssetImageUrls(token.chainId, token.address) ?? []),
    ].filter((image): image is string => Boolean(image));
    return [...new Set(urls)].map((uri) => ({ uri }));
  }, [token.image, token.chainId, token.address, bridgeImageUri]);

  const { source, onError, uniqueSourceImageKey } =
    useSmartImageFallback(images);

  const avatar = (
    <AvatarToken
      key={uniqueSourceImageKey}
      name={token.symbol}
      src={source}
      size={size}
      imageOrSvgProps={{
        imageProps: { onError, testID: QUICK_BUY_TOKEN_ICON_AVATAR_TEST_ID },
      }}
    />
  );

  if (!networkImageSource) {
    return avatar;
  }

  return (
    <BadgeWrapper
      style={styles.badgeWrapper}
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          imageSource={networkImageSource}
        />
      }
    >
      {avatar}
    </BadgeWrapper>
  );
};

export default QuickBuyTokenIcon;
