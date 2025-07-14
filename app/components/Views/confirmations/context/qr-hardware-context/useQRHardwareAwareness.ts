import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { RootState } from 'app/components/UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { useSelector } from 'react-redux';

export const useQRHardwareAwareness = () => {
  const { pendingScanRequest } = useSelector(
    (state: RootState) => state.qrKeyringScanner,
  );

  return {
    isQRSigningInProgress: pendingScanRequest?.type === QrScanRequestType.SIGN,
    isSigningQRObject: pendingScanRequest?.type === QrScanRequestType.SIGN,
    pendingScanRequest,
  };
};
