import { useContext, useEffect, useRef } from 'react';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { strings } from '../../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import {
  useGasFeeToken,
  useSelectedGasFeeToken,
} from '../../../hooks/gas/useGasFeeToken';
import { selectTokensByChainIdAndAddress } from '../../../../../../selectors/tokensController';
import { RootState } from '../../../../../../reducers';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useNetworkInfo from '../../../hooks/useNetworkInfo';

export function GasFeeTokenToast() {
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId } = transactionMetadata || {};
  const toastContext = useContext(ToastContext);
  const toast = toastContext?.toastRef?.current;
  const nativeGasFeeToken = useGasFeeToken({
    tokenAddress: NATIVE_TOKEN_ADDRESS,
  });
  const { networkImage } = useNetworkInfo(chainId);
  const gasFeeToken = useSelectedGasFeeToken() ?? nativeGasFeeToken;
  const prevRef = useRef(NATIVE_TOKEN_ADDRESS);

  const tokensResult = useSelector((state: RootState) =>
    selectTokensByChainIdAndAddress(state, chainId as Hex),
  );

  const tokenSelected = Object.values(tokensResult || {}).find(
    (t) =>
      gasFeeToken &&
      t.address.toLowerCase() === gasFeeToken.tokenAddress.toLowerCase(),
  );

  useEffect(() => {
    if (!toast || !gasFeeToken) return;
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
      networkImageSource: tokenSelected
        ? { uri: tokenSelected.image }
        : networkImage ?? { uri: '' },
    });
  }, [gasFeeToken, tokenSelected, toast, networkImage]);

  return null;
}
