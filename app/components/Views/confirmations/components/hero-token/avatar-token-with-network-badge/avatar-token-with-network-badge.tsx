import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../../../component-library/hooks';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';
import { NetworkBadgeSource } from '../../../../../UI/AssetOverview/Balance/Balance';
import { TokenI } from '../../../../../UI/Tokens/types';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { useTokenAsset } from '../../../hooks/useTokenAsset';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { styleSheet } from './avatar-token-with-network-badge.styles';
import { View } from 'react-native';

const AvatarTokenOrNetworkAssetLogo = ({
  asset,
  chainId,
  displayName,
}: {
  asset: TokenI;
  chainId: Hex;
  displayName: string;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { image, isNative } = asset;
  const isUnknownToken = displayName === strings('token.unknown');

  return isNative ? (
    <NetworkAssetLogo
      big
      biggest
      chainId={chainId}
      style={styles.avatarToken}
      ticker={displayName}
    />
  ) : (
    <AvatarToken
      imageSource={image ? { uri: image } : NetworkBadgeSource(chainId as Hex)}
      name={isUnknownToken ? undefined : displayName}
      size={AvatarSize.Xl}
      style={styles.avatarToken}
      testID={`avatar-with-badge-avatar-token-${displayName}`}
    />
  );
};

export const AvatarTokenWithNetworkBadge = () => {
  const { styles } = useStyles(styleSheet, {});
  const { chainId } =
    useTransactionMetadataRequest() ?? ({} as TransactionMeta);
  const { asset, displayName } = useTokenAsset();
  const { networkName, networkImage } = useNetworkInfo(chainId);

  return (
    <View style={styles.base}>
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            imageSource={networkImage}
            name={networkName}
            variant={BadgeVariant.Network}
          />
        }
      >
        <AvatarTokenOrNetworkAssetLogo
          asset={asset as TokenI}
          chainId={chainId}
          displayName={displayName}
        />
      </BadgeWrapper>
    </View>
  );
};
