import React, { useEffect, useRef } from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  AvatarToken,
  AvatarTokenSize,
  toast,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import {
  useGasFeeToken,
  useSelectedGasFeeToken,
} from '../../../hooks/gas/useGasFeeToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { getNetworkImageSource } from '../../../../../../util/networks';

export function GasFeeTokenToast() {
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId } = transactionMetadata || {};
  const nativeGasFeeToken = useGasFeeToken({
    tokenAddress: NATIVE_TOKEN_ADDRESS,
  });
  const gasFeeToken = useSelectedGasFeeToken() ?? nativeGasFeeToken;
  const prevRef = useRef(NATIVE_TOKEN_ADDRESS);

  const tokenSelected = useTokenWithBalance(
    gasFeeToken?.tokenAddress,
    chainId as Hex,
  );
  const networkImageSource = getNetworkImageSource({
    chainId: chainId ?? '0x1',
  });

  useEffect(() => {
    if (!gasFeeToken || !transactionMetadata) return;
    if (gasFeeToken.tokenAddress === prevRef.current) return;

    prevRef.current = gasFeeToken.tokenAddress;

    toast({
      title: `${strings('gas_fee_token_toast.message')}${gasFeeToken.symbol}.`,
      startAccessory: tokenSelected?.image ? (
        <AvatarToken
          src={{ uri: tokenSelected.image }}
          size={AvatarTokenSize.Md}
        />
      ) : (
        <AvatarNetwork src={networkImageSource} size={AvatarNetworkSize.Md} />
      ),
      hasNoTimeout: false,
    });
  }, [gasFeeToken, tokenSelected, networkImageSource, transactionMetadata]);

  return null;
}
