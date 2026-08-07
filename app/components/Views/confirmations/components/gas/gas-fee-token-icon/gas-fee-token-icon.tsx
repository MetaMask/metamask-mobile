import React from 'react';
import { Hex } from '@metamask/utils';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import { View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './gas-fee-token-icon.styles';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import { getAssetImageUrl } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';

export enum GasFeeTokenIconSize {
  Sm = 'sm',
  Md = 'md',
}

export function GasFeeTokenIcon({
  size = GasFeeTokenIconSize.Md,
  tokenAddress,
}: {
  size?: GasFeeTokenIconSize;
  tokenAddress: Hex;
}) {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const { chainId: chainIdSingle } = transactionMeta || {};
  const { chainId: chainIdBatch } = transactionBatchesMetadata || {};
  const chainId = chainIdSingle ?? chainIdBatch;
  const token = useTokenWithBalance(tokenAddress, chainId as Hex);
  const {
    networkImage,
    networkNativeCurrency: nativeCurrency,
    networkName,
  } = useNetworkInfo(chainId);

  const { styles } = useStyles(styleSheet, {
    isLogoSizeMd: size === GasFeeTokenIconSize.Md,
  });

  if (tokenAddress !== NATIVE_TOKEN_ADDRESS) {
    return (
      <View testID="token-icon">
        <TokenIconWithNetworkBadge
          size={size}
          token={token}
          tokenAddress={tokenAddress}
          chainId={chainId as Hex}
          networkName={networkName}
          networkImage={networkImage}
          nativeCurrency={nativeCurrency}
        />
      </View>
    );
  }

  return (
    <View testID="native-icon">
      <NetworkAssetLogo
        chainId={token?.chainId ?? (chainId as Hex)}
        style={styles.logoNative}
        emptyIconTextStyle={styles.emptyIconText}
        ticker={token?.symbol ?? (nativeCurrency as string)}
        big={false}
        biggest={false}
        testID={token?.name}
      />
    </View>
  );
}

function TokenIconWithNetworkBadge({
  size,
  token,
  tokenAddress,
  chainId,
  networkName,
  networkImage,
  nativeCurrency,
}: {
  size: GasFeeTokenIconSize;
  token?: ReturnType<typeof useTokenWithBalance>;
  tokenAddress: Hex;
  chainId?: Hex;
  networkName?: string;
  networkImage?: object;
  nativeCurrency?: string;
}) {
  const { styles } = useStyles(styleSheet, {});
  const imageUri =
    token?.image ||
    (chainId ? getAssetImageUrl(tokenAddress, chainId) : undefined);

  return (
    <View>
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={
          networkImage ? (
            <BadgeNetwork
              src={networkImage}
              name={networkName}
              testID="gas-fee-token-network-badge"
            />
          ) : null
        }
        style={styles.badgeWrapper}
      >
        <AvatarToken
          imageSource={imageUri ? { uri: imageUri } : networkImage}
          name={token?.symbol ?? nativeCurrency}
          size={size === GasFeeTokenIconSize.Md ? AvatarSize.Md : AvatarSize.Xs}
        />
      </BadgeWrapper>
    </View>
  );
}
