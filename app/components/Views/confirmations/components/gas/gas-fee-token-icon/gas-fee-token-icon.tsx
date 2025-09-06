import React from 'react';
import { Hex } from '@metamask/utils';
import { useStyles } from '../../../../../hooks/useStyles';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './gas-fee-token-icon.styles';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { View } from 'react-native';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { RootState } from '../../../../../../reducers';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../../selectors/tokensController';
import { TokenI } from '../../../../../UI/Tokens/types';
import { useTokenAsset } from '../../../hooks/useTokenAsset';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';

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
  const { asset } = useTokenAsset() || {};
  const { chainId } = transactionMeta || {};
  const {
    networkImage,
    networkNativeCurrency: nativeCurrency,
    networkName,
  } = useNetworkInfo(chainId);
  const tokensResult = useSelector((state: RootState) =>
    selectTokensByChainIdAndAddress(state, chainId as Hex),
  );

  const { styles } = useStyles(styleSheet, {
    isLogoSizeMd: size === GasFeeTokenIconSize.Md,
  });

  const token = Object.values(tokensResult || {}).find(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  ) as TokenI | undefined;

  if (tokenAddress !== NATIVE_TOKEN_ADDRESS) {
    return (
      <View testID="token-icon">
        <TokenIconWithNetworkBadge
          size={size}
          token={token}
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
        chainId={asset?.chainId ?? (chainId as Hex)}
        style={styles.logoNative}
        ticker={asset?.ticker ?? asset?.symbol ?? nativeCurrency}
        big={false}
        biggest={false}
        testID={asset?.name}
      />
    </View>
  );
}

function TokenIconWithNetworkBadge({
  size,
  token,
  networkName,
  networkImage,
  nativeCurrency,
}: {
  size: GasFeeTokenIconSize;
  token?: TokenI;
  networkName?: string;
  networkImage?: object;
  nativeCurrency?: string;
}) {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View>
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={networkImage}
          />
        }
        style={styles.badgeWrapper}
      >
        <AvatarToken
          imageSource={token ? { uri: token?.image } : networkImage}
          name={nativeCurrency}
          size={size === GasFeeTokenIconSize.Md ? AvatarSize.Md : AvatarSize.Xs}
        />
      </BadgeWrapper>
    </View>
  );
}
