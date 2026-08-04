import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import { useStyles } from '../../../../../../component-library/hooks';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';
import { NetworkBadgeSource } from '../../../../../UI/AssetOverview/Balance/Balance';
import { TokenI } from '../../../../../UI/Tokens/types';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { useTokenAsset } from '../../../hooks/useTokenAsset';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { styleSheet } from './avatar-token-with-network-badge.styles';

const AvatarTokenOrNetworkAssetLogo = ({
  asset,
  chainId,
  displayName,
  size = AvatarSize.Xl,
}: {
  asset: TokenI;
  chainId: Hex;
  displayName: string;
  size?: AvatarSize;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { image, isNative } = asset;
  const isUnknownToken = displayName === strings('token.unknown');
  const isBiggest = size === AvatarSize.Xl;
  return isNative ? (
    <NetworkAssetLogo
      big
      biggest={isBiggest}
      chainId={chainId}
      style={styles.avatarToken}
      ticker={displayName}
      testID={`avatar-with-badge-avatar-token-${displayName}`}
    />
  ) : (
    <AvatarToken
      imageSource={image ? { uri: image } : NetworkBadgeSource(chainId as Hex)}
      name={isUnknownToken ? undefined : displayName}
      size={size}
      style={styles.avatarToken}
      testID={`avatar-with-badge-avatar-token-${displayName}`}
    />
  );
};

export const AvatarTokenWithNetworkBadge = ({
  size,
}: { size?: AvatarSize } = {}) => {
  const { styles } = useStyles(styleSheet, {});
  const { chainId } =
    useTransactionMetadataRequest() ?? ({} as TransactionMeta);
  const { asset, displayName } = useTokenAsset();
  const { networkName, networkImage } = useNetworkInfo(chainId);

  return (
    <View style={styles.base}>
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={
          networkImage ? (
            <BadgeNetwork src={networkImage} name={networkName} />
          ) : null
        }
      >
        <AvatarTokenOrNetworkAssetLogo
          asset={asset as TokenI}
          chainId={chainId}
          displayName={displayName}
          size={size}
        />
      </BadgeWrapper>
    </View>
  );
};
