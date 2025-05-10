import React from 'react';
import { useSelector } from 'react-redux';
import { TransactionMeta } from '@metamask/transaction-controller';

import { AvatarSize } from '../../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarNetwork from '../../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork';
import AvatarToken from '../../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../../../../../component-library/hooks';
import { NameType } from '../../../../../../../UI/Name/Name.types';
import { useDisplayName } from '../../../../../../../hooks/DisplayName/useDisplayName';
import { RootState } from '../../../../../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../../../../util/networks';
import useNetworkInfo from '../../../../../hooks/useNetworkInfo';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import { isNativeToken } from '../../../../../utils/token';
import { styleSheet } from './avatar-token-with-network-badge.styles';

const AvatarTokenNetwork = () => {
  const { styles } = useStyles(styleSheet, {});

  const transactionMeta =
    useTransactionMetadataRequest() ?? ({} as TransactionMeta);
  const { chainId } = transactionMeta;

  const { nativeCurrency } = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );
  const isNative = isNativeToken(transactionMeta);
  const networkImage = getNetworkImageSource({ chainId });

  const { image, name: symbol } = useDisplayName({
    preferContractSymbol: true,
    type: NameType.EthereumAddress,
    value: transactionMeta?.txParams?.to ?? '',
    variation: chainId ?? '',
  });

  return isNative ? (
    <AvatarNetwork
      name={nativeCurrency ?? ''}
      imageSource={networkImage}
      size={AvatarSize.Xl}
      style={styles.avatarNetwork}
    />
  ) : (
    <AvatarToken
      imageSource={image ? { uri: image } : undefined}
      name={symbol ?? ''}
      size={AvatarSize.Xl}
    />
  );
};

export const AvatarTokenWithNetworkBadge = () => {
  const transactionMeta = useTransactionMetadataRequest() ?? ({} as TransactionMeta);
  const { networkName, networkImage } = useNetworkInfo(
    transactionMeta?.chainId,
  );
  const isNative = isNativeToken(transactionMeta);

  return (
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={!isNative && networkImage ? (
        <Badge
          imageSource={networkImage}
          variant={BadgeVariant.Network}
          name={networkName}
        />
      ) : null}
    >
      <AvatarTokenNetwork />
    </BadgeWrapper>
  );
};
