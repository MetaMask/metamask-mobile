import React, { ComponentClass } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/reducers';
import { QrScanRequest, QrScanRequestType } from '@metamask/eth-qr-keyring';

const withQRHardwareAwareness = (
  Children: ComponentClass<{
    pendingScanRequest?: QrScanRequest;
    isSigningQRObject?: boolean;
    isSyncingQRHardware?: boolean;
  }>,
) => {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const QRHardwareAwareness = (props: any) => {
    const { pendingScanRequest } = useSelector(
      (state: RootState) => state.qrKeyringScanner,
    );

    return (
      <Children
        {...props}
        isSigningQRObject={pendingScanRequest?.type === QrScanRequestType.SIGN}
        isSyncingQRHardware={
          pendingScanRequest?.type === QrScanRequestType.PAIR
        }
        pendingScanRequest={pendingScanRequest}
      />
    );
  };

  return QRHardwareAwareness;
};

export default withQRHardwareAwareness;
