import React from 'react';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import type { TokenI } from '../../../Tokens/types';

const EarnAssetIcon = ({ token }: { token: TokenI }) => {
  const networkImageSource = token.chainId
    ? getNetworkImageSource({ chainId: token.chainId })
    : undefined;

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <BadgeNetwork
          name={token.chainId ?? ''}
          src={networkImageSource}
          twClassName="rounded-1"
        />
      }
    >
      <AssetLogo asset={token} />
    </BadgeWrapper>
  );
};

export default EarnAssetIcon;
