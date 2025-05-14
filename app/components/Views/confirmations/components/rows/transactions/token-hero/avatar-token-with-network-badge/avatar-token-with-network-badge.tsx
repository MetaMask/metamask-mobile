import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import NetworkAssetLogo from '../../../../../../../UI/NetworkAssetLogo';
import { AvatarSize } from '../../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../../../../../component-library/hooks';
import { CHAINLIST_CURRENCY_SYMBOLS_MAP, NETWORKS_CHAIN_ID } from '../../../../../../../../constants/network';
import useNetworkInfo from '../../../../../hooks/useNetworkInfo';
import { useTokenAssetByType } from '../../../../../hooks/useTokenAssetByType';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import { styleSheet } from './avatar-token-with-network-badge.styles';

const AvatarTokenNetwork = ({ chainId }: { chainId: Hex }) => {
  const { styles } = useStyles(styleSheet, {});
  const { asset: { image, isNative, name, ticker } } = useTokenAssetByType();

  return isNative ? (
    <NetworkAssetLogo
      chainId={chainId}
      ticker={ticker ?? ''}
      big
      biggest={false}
      style={styles.avatarToken}
      testID={name ?? ''}
    />
  ) : (
    <AvatarToken
      imageSource={image ? { uri: image } : undefined}
      name={name ?? ''}
      size={AvatarSize.Xl}
      style={styles.avatarToken}
    />
  );
};

export const AvatarTokenWithNetworkBadge = () => {
  const { chainId } = useTransactionMetadataRequest() ?? ({} as TransactionMeta);
  const { networkName, networkImage } = useNetworkInfo(chainId);
  const { asset: { ticker } } = useTokenAssetByType();

  const isEthOnMainnet = chainId === NETWORKS_CHAIN_ID.MAINNET 
    && ticker === CHAINLIST_CURRENCY_SYMBOLS_MAP.MAINNET;
  const showBadge = networkImage && !isEthOnMainnet;

  return (
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={showBadge ? (
        <Badge
          imageSource={networkImage}
          variant={BadgeVariant.Network}
          name={networkName}
        />
      ) : null}
    >
      <AvatarTokenNetwork chainId={chainId} />
    </BadgeWrapper>
  );
};
