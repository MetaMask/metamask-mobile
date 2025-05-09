import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';

import Engine from '../../../../../core/Engine';
import { IQRState } from '../../../../UI/QRHardware/types';
import { useCamera } from './useCamera';
import { useQRHardwareAwareness } from './useQRHardwareAwareness';

export interface QRHardwareContextType {
  QRState?: IQRState;
  cameraError: string | undefined;
  cancelQRScanRequestIfPresent: () => Promise<void>;
  isQRSigningInProgress: boolean;
  isSigningQRObject: boolean;
  needsCameraPermission: boolean;
  scannerVisible: boolean;
  setRequestCompleted: () => void;
  setScannerVisible: (visibility: boolean) => void;
}

export const QRHardwareContext = createContext<QRHardwareContextType>({
  QRState: undefined,
  cameraError: undefined,
  cancelQRScanRequestIfPresent: () => Promise.resolve(),
  isQRSigningInProgress: false,
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
  const { isQRSigningInProgress, isSigningQRObject, QRState } =
    useQRHardwareAwareness();
  const { cameraError, hasCameraPermission } = useCamera(isSigningQRObject);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isRequestCompleted, setRequestCompleted] = useState(false);

  const KeyringController = Engine.context.KeyringController;

  const cancelRequest = useCallback(
    (e) => {
      if (isRequestCompleted) {
        return;
      }
      e.preventDefault();
      KeyringController.cancelQRSignRequest().then(() => {
        navigation.dispatch(e.data.action);
      });
    },
    [KeyringController, isRequestCompleted, navigation],
  );

  useEffect(() => {
    navigation.addListener('beforeRemove', cancelRequest);
    return () => navigation.removeListener('beforeRemove', cancelRequest);
  }, [cancelRequest, navigation]);

  const cancelQRScanRequestIfPresent = useCallback(async () => {
    if (!isQRSigningInProgress) {
      return;
    }
    await KeyringController.cancelQRSignRequest();
    setRequestCompleted(true);
    setScannerVisible(false);
  }, [
    KeyringController,
    isQRSigningInProgress,
    setRequestCompleted,
    setScannerVisible,
  ]);

  return (
    <QRHardwareContext.Provider
      value={{
        QRState,
        cameraError,
        cancelQRScanRequestIfPresent,
        isQRSigningInProgress,
        isSigningQRObject,
        needsCameraPermission: isQRSigningInProgress && !hasCameraPermission,
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
