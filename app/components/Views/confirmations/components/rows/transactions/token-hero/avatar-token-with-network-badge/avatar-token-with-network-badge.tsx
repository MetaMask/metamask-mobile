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

const AvatarTokenOrNetworkAssetLogo = ({
  asset,
  chainId,
}: {
  asset: TokenI;
  chainId: Hex;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { image, isNative, name, symbol, ticker } = asset;

  return isNative ? (
    <NetworkAssetLogo
      chainId={chainId}
      ticker={ticker ?? symbol}
      big
      biggest={false}
      style={styles.avatarToken}
      testID={`avatar-with-badge-network-asset-logo-${ticker ?? symbol}`}
    />
  ) : (
    <AvatarToken
      imageSource={image ? { uri: image } : undefined}
      name={name ?? ''}
      size={AvatarSize.Xl}
      style={styles.avatarToken}
      testID={`avatar-with-badge-avatar-token-${ticker ?? symbol}`}
    />
  );
};

export const AvatarTokenWithNetworkBadge = () => {
  const { chainId } =
    useTransactionMetadataRequest() ?? ({} as TransactionMeta);
  const { asset } = useTokenAsset();

  const { networkName, networkImage } = useNetworkInfo(chainId);
  const { symbol } = asset;

  const isEthOnMainnet =
    chainId === NETWORKS_CHAIN_ID.MAINNET &&
    symbol === CHAINLIST_CURRENCY_SYMBOLS_MAP.MAINNET;
  const showBadge = networkImage && !isEthOnMainnet;

  return showBadge ? (
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        <Badge
          imageSource={networkImage}
          variant={BadgeVariant.Network}
          name={networkName}
        />
      }
    >
      <AvatarTokenOrNetworkAssetLogo asset={asset} chainId={chainId} />
    </BadgeWrapper>
  ) : (
    <AvatarTokenOrNetworkAssetLogo asset={asset} chainId={chainId} />
  );
};
