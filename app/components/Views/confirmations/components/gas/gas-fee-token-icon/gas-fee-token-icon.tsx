import React from 'react';
import { Hex } from '@metamask/utils';
import { useStyles } from '../../../../../hooks/useStyles';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './gas-fee-token-icon.styles';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { View } from 'react-native';
import Identicon from '../../../../../UI/Identicon';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import useNetworkInfo from '../../../hooks/useNetworkInfo';

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
  const { chainId } = transactionMeta || {};
  const { networkImage, networkNativeCurrency: nativeCurrency } =
    useNetworkInfo(chainId);
  const { styles } = useStyles(styleSheet, {});

  if (tokenAddress !== NATIVE_TOKEN_ADDRESS) {
    return (
      <View testID="token-icon">
        <Identicon
          address={tokenAddress}
          diameter={size === GasFeeTokenIconSize.Md ? 32 : 12}
        />
      </View>
    );
  }

  return (
    <View testID="native-icon">
      <AvatarToken
        src={networkImage}
        name={nativeCurrency}
        size={
          size === GasFeeTokenIconSize.Md
            ? AvatarTokenSize.Md
            : AvatarTokenSize.Xs
        }
        style={styles.nativeTokenIcon}
      />
    </View>
  );
}
