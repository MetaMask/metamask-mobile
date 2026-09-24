import React from 'react';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import type { EarnAsset } from '../../types/earnAssets';

/**
 * Renders an Earn asset logo with its network badge.
 *
 * @param asset - Earn asset whose logo and network should be displayed.
 */
const EarnAssetIcon = ({ asset }: { asset: EarnAsset }) => {
  const { metadata } = asset;
  const networkImageSource = getNetworkImageSource({
    chainId: metadata.chainId,
  });

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <BadgeNetwork
          name={metadata.chainId}
          src={networkImageSource}
          twClassName="rounded-1"
        />
      }
    >
      <AssetLogo asset={metadata} />
    </BadgeWrapper>
  );
};

export default EarnAssetIcon;
