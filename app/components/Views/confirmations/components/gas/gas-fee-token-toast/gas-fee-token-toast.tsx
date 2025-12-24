import { useContext, useEffect, useRef } from 'react';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { strings } from '../../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import {
  useGasFeeToken,
  useSelectedGasFeeToken,
} from '../../../hooks/gas/useGasFeeToken';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../../../../../component-library/components/Buttons/Button';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { getNetworkImageSource } from '../../../../../../util/networks';

export function GasFeeTokenToast() {
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId } = transactionMetadata || {};
  const toastContext = useContext(ToastContext);
  const toast = toastContext?.toastRef?.current;
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
    if (!toast || !gasFeeToken || !transactionMetadata) return;
    if (gasFeeToken.tokenAddress === prevRef.current) return;

    prevRef.current = gasFeeToken.tokenAddress;

    toast.showToast({
      labelOptions: [
        { label: strings('gas_fee_token_toast.message'), isBold: false },
        { label: `${gasFeeToken.symbol}`, isBold: true },
        { label: '.', isBold: false },
      ],
      variant: ToastVariants.Network,
      hasNoTimeout: false,
      customBottomOffset: 24, // Add custom offset to avoid overlapping with confirmation buttons
      networkImageSource: tokenSelected?.image
        ? { uri: tokenSelected.image }
        : networkImageSource,
      closeButtonOptions: {
        variant: ButtonVariants.Primary,
        endIconName: IconName.Close,
        label: undefined,
        onPress: () => {
          toast?.closeToast();
        },
        style: {
          backgroundColor: 'transparent',
          paddingHorizontal: 4,
          paddingVertical: 10,
          height: 20,
        },
      },
    });
  }, [
    gasFeeToken,
    tokenSelected,
    toast,
    networkImageSource,
    transactionMetadata,
  ]);

  return null;
}
