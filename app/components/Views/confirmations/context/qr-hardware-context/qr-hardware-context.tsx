import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigation, NavigationAction } from '@react-navigation/native';

import Engine from '../../../../../core/Engine';
import { useCamera } from './useCamera';
import { useQRHardwareAwareness } from './useQRHardwareAwareness';
import { QrScanRequest } from '@metamask/eth-qr-keyring';

export interface QRHardwareContextType {
  pendingScanRequest?: QrScanRequest;
  cameraError: string | undefined;
  cancelQRScanRequestIfPresent: () => Promise<void>;
  isSigningQRObject: boolean;
  needsCameraPermission: boolean;
  scannerVisible: boolean;
  setRequestCompleted: () => void;
  setScannerVisible: (visibility: boolean) => void;
}

export const QRHardwareContext = createContext<QRHardwareContextType>({
  pendingScanRequest: undefined,
  cameraError: undefined,
  cancelQRScanRequestIfPresent: () => Promise.resolve(),
  isSigningQRObject: false,
  needsCameraPermission: false,
  scannerVisible: false,
  setRequestCompleted: () => undefined,
  setScannerVisible: () => undefined,
});

export const QRHardwareContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();
  const { isSigningQRObject, pendingScanRequest } = useQRHardwareAwareness();
  const { cameraError, hasCameraPermission } = useCamera(isSigningQRObject);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isRequestCompleted, setRequestCompleted] = useState(false);

  const cancelRequest = useCallback(
    (e: { preventDefault: () => void; data: { action: NavigationAction } }) => {
      if (isRequestCompleted) {
        return;
      }
      e.preventDefault();
      if (isSigningQRObject) {
        Engine.getQrKeyringScanner().rejectPendingScan(
          new Error('Request cancelled'),
        );
      }
      navigation.dispatch(e.data.action);
    },
    [isRequestCompleted, navigation, isSigningQRObject],
  );

  useEffect(() => {
    navigation.addListener('beforeRemove', cancelRequest);
    return () => navigation.removeListener('beforeRemove', cancelRequest);
  }, [cancelRequest, navigation]);

  const cancelQRScanRequestIfPresent = useCallback(async () => {
    if (!isSigningQRObject) {
      return;
    }
    Engine.getQrKeyringScanner().rejectPendingScan(
      new Error('Request cancelled'),
    );
    setRequestCompleted(true);
    setScannerVisible(false);
  }, [isSigningQRObject, setRequestCompleted, setScannerVisible]);

  return (
    <QRHardwareContext.Provider
      value={{
        pendingScanRequest,
        cameraError,
        cancelQRScanRequestIfPresent,
        isSigningQRObject,
        needsCameraPermission: isSigningQRObject && !hasCameraPermission,
        scannerVisible,
        setRequestCompleted: () => setRequestCompleted(true),
        setScannerVisible,
      }}
    >
      {children}
    </QRHardwareContext.Provider>
  );
};

export const useQRHardwareContext = () => {
  const context = useContext(QRHardwareContext);
  if (!context) {
    throw new Error(
      'useQRHardwareContext must be used within an QRHardwareContextProvider',
    );
  }
  return context;
};
