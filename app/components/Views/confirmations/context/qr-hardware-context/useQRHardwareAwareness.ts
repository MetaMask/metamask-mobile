import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { RootState } from '../../../../../reducers';
import { useSelector } from 'react-redux';

export const useQRHardwareAwareness = () => {
  const { pendingScanRequest } = useSelector(
    (state: RootState) => state.qrKeyringScanner,
  );

  return {
    isSigningQRObject: pendingScanRequest?.type === QrScanRequestType.SIGN,
    pendingScanRequest,
  };
};
