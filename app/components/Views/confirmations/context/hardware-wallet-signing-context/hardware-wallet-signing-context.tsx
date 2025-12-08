import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigation, NavigationAction } from '@react-navigation/native';

import { HardwareWalletType } from '../../../../../core/HardwareWallets/types';
import { useHardwareWallet } from '../../../../../core/HardwareWallets';
import { QrScanRequest } from '@metamask/eth-qr-keyring';
import Engine from '../../../../../core/Engine';
import { useQRHardwareAwareness } from '../qr-hardware-context/useQRHardwareAwareness';
import { useCamera } from '../qr-hardware-context/useCamera';
import LedgerSignModal from '../../components/modals/ledger-sign-modal';

export interface HardwareWalletSigningContextType {
  walletType: HardwareWalletType | null;
  isHardwareWalletAccount: boolean;
  isSigningInProgress: boolean;
  modalVisible: boolean;
  pendingRequest: QrScanRequest | undefined;
  error: string | undefined;
  deviceId: string | undefined;
  isSigning: boolean;
  needsPermission: boolean;

  // Actions
  openSignModal: () => void;
  closeSignModal: () => void;
  cancelRequest: () => Promise<void>;
  markRequestCompleted: () => void;
}

const defaultContextValue: HardwareWalletSigningContextType = {
  walletType: null,
  isHardwareWalletAccount: false,
  isSigningInProgress: false,
  modalVisible: false,
  pendingRequest: undefined,
  error: undefined,
  deviceId: undefined,
  isSigning: false,
  needsPermission: false,
  openSignModal: () => undefined,
  closeSignModal: () => undefined,
  cancelRequest: () => Promise.resolve(),
  markRequestCompleted: () => undefined,
};

export const HardwareWalletSigningContext =
  createContext<HardwareWalletSigningContextType>(defaultContextValue);

export const HardwareWalletSigningContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();

  // Use the HardwareWalletContext for wallet detection and device info
  const {
    isHardwareWalletAccount,
    detectedWalletType: walletType,
    deviceId: hwDeviceId,
  } = useHardwareWallet();

  // Generic signing state
  const [isSigningInProgress, setIsSigningInProgress] = useState(
    isHardwareWalletAccount,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [isRequestCompleted, setIsRequestCompleted] = useState(false);

  // QR-specific hooks (only active for QR wallets)
  const isQRAccount = walletType === HardwareWalletType.QR;
  const { isSigningQRObject, pendingScanRequest } = useQRHardwareAwareness();
  const { cameraError, hasCameraPermission } = useCamera(
    isQRAccount && isSigningQRObject,
  );

  // Derived state based on wallet type
  const deviceId =
    walletType === HardwareWalletType.LEDGER ? (hwDeviceId ?? '') : '';
  const pendingRequest = isQRAccount
    ? (pendingScanRequest as QrScanRequest | undefined)
    : undefined;
  const error = isQRAccount ? cameraError : undefined;
  const isSigning = isQRAccount ? isSigningQRObject : false;
  const needsPermission = isQRAccount
    ? isSigningQRObject && !hasCameraPermission
    : false;

  // QR navigation cancellation handler
  const handleNavigationCancel = useCallback(
    (e: { preventDefault: () => void; data: { action: NavigationAction } }) => {
      if (isRequestCompleted) {
        return;
      }
      e.preventDefault();
      if (isQRAccount && isSigningQRObject) {
        Engine.getQrKeyringScanner().rejectPendingScan(
          new Error('Request cancelled'),
        );
      }
      navigation.dispatch(e.data.action);
    },
    [isRequestCompleted, navigation, isQRAccount, isSigningQRObject],
  );

  // Set up navigation listener for cancellation
  useEffect(() => {
    if (isQRAccount) {
      navigation.addListener('beforeRemove', handleNavigationCancel);
      return () =>
        navigation.removeListener('beforeRemove', handleNavigationCancel);
    }
  }, [handleNavigationCancel, navigation, isQRAccount]);

  // Actions
  const openSignModal = useCallback(async () => {
    if (!walletType) {
      return;
    }

    if (walletType === HardwareWalletType.LEDGER) {
      setIsSigningInProgress(false);
    }
    setModalVisible(true);
  }, [walletType]);

  const closeSignModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const cancelRequest = useCallback(async () => {
    if (isQRAccount && isSigningQRObject) {
      Engine.getQrKeyringScanner().rejectPendingScan(
        new Error('Request cancelled'),
      );
      setIsRequestCompleted(true);
    }
    setModalVisible(false);
  }, [isQRAccount, isSigningQRObject]);

  const markRequestCompleted = useCallback(() => {
    setIsRequestCompleted(true);
  }, []);

  console.log('1111 error', error);

  // Memoize context value
  const contextValue = useMemo<HardwareWalletSigningContextType>(
    () => ({
      walletType,
      isHardwareWalletAccount,
      isSigningInProgress,
      modalVisible,
      pendingRequest,
      error,
      deviceId,
      isSigning,
      needsPermission,
      openSignModal,
      closeSignModal,
      cancelRequest,
      markRequestCompleted,
    }),
    [
      walletType,
      isHardwareWalletAccount,
      isSigningInProgress,
      modalVisible,
      pendingRequest,
      error,
      deviceId,
      isSigning,
      needsPermission,
      openSignModal,
      closeSignModal,
      cancelRequest,
      markRequestCompleted,
    ],
  );

  // Render hardware wallet modal based on type
  const renderSignModal = () => {
    console.log('renderSignModal', modalVisible, hwDeviceId);
    if (!modalVisible || !hwDeviceId) {
      return null;
    }
    if (walletType === HardwareWalletType.LEDGER) {
      return React.createElement(LedgerSignModal);
    }
    // QR modal is rendered inline by QRInfo component
    return null;
  };

  return (
    <HardwareWalletSigningContext.Provider value={contextValue}>
      {children}
      {renderSignModal()}
    </HardwareWalletSigningContext.Provider>
  );
};

export const useHardwareWalletSigningContext = () => {
  const context = useContext(HardwareWalletSigningContext);
  if (!context) {
    throw new Error(
      'useHardwareWalletSigningContext must be used within an HardwareWalletSigningContextProvider',
    );
  }
  return context;
};
