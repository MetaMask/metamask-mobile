import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { AvatarSize } from '../../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../../../../../component-library/hooks';
import {
  CHAINLIST_CURRENCY_SYMBOLS_MAP,
  NETWORKS_CHAIN_ID,
} from '../../../../../../../../constants/network';
import NetworkAssetLogo from '../../../../../../../UI/NetworkAssetLogo';
import { TokenI } from '../../../../../../../UI/Tokens/types';
import useNetworkInfo from '../../../../../hooks/useNetworkInfo';
import { useTokenAsset } from '../../../../../hooks/useTokenAsset';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import { styleSheet } from './avatar-token-with-network-badge.styles';
import { View } from 'react-native';
import { strings } from '../../../../../../../../../locales/i18n';

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
      imageSource={image ? { uri: image } : undefined}
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
  const { symbol } = asset;

  const isEthOnMainnet =
    chainId === NETWORKS_CHAIN_ID.MAINNET &&
    symbol === CHAINLIST_CURRENCY_SYMBOLS_MAP.MAINNET;
  const showBadge = networkImage && !isEthOnMainnet;

  return (
    <View style={styles.base}>
      {showBadge ? (
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
            asset={asset}
            chainId={chainId}
            displayName={displayName}
          />
        </BadgeWrapper>
      ) : (
        <AvatarTokenOrNetworkAssetLogo
          asset={asset}
          chainId={chainId}
          displayName={displayName}
        />
      )}
    </View>
  );
};
