import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { getDeviceId } from '../../../../../core/Ledger/Ledger';
import {
  getKeyringByAddress,
  isHardwareAccount,
} from '../../../../../util/address';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import LedgerSignModal from '../../components/modals/ledger-sign-modal';

export interface LedgerContextType {
  deviceId?: string;
  isLedgerAccount: boolean;
  ledgerSigningInProgress: boolean;
  openLedgerSignModal: () => void;
  closeLedgerSignModal: () => void;
}

export const LedgerContext = createContext<LedgerContextType>({
  deviceId: undefined,
  isLedgerAccount: false,
  ledgerSigningInProgress: false,
  openLedgerSignModal: () => undefined,
  closeLedgerSignModal: () => undefined,
});

export const LedgerContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const fromAddress =
    (approvalRequest?.requestData?.from as string) ||
    (transactionMetadata?.txParams?.from as string);
  const isLedgerAccount =
    isHardwareAccount(fromAddress, [ExtendedKeyringTypes.ledger]) ?? false;
  const [ledgerSigningInProgress, setLedgerSigningInProgress] =
    useState(isLedgerAccount);
  const [ledgerSignModalOpen, setLedgerSignModalOpen] = useState(false);
  const [deviceId, setDeviceId] = useState<string>();

  const openLedgerSignModal = useCallback(() => {
    setLedgerSigningInProgress(false);
    setLedgerSignModalOpen(true);
  }, []);

  const closeLedgerSignModal = useCallback(() => {
    setLedgerSignModalOpen(false);
  }, [setLedgerSignModalOpen]);

  useEffect(() => {
    if (!isLedgerAccount) {
      return;
    }

    let isMounted = true;
    const keyring = getKeyringByAddress(fromAddress);
    if (!keyring) {
      throw new Error(`Keyring not found for address ${fromAddress}`);
    }

    (async () => {
      const id = await getDeviceId();
      if (isMounted) {
        setDeviceId(id);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fromAddress, isLedgerAccount, setDeviceId]);

  return (
    <LedgerContext.Provider
      value={{
        deviceId,
        isLedgerAccount,
        ledgerSigningInProgress,
        openLedgerSignModal,
        closeLedgerSignModal,
      }}
    >
      {children}
      {ledgerSignModalOpen && <LedgerSignModal />}
    </LedgerContext.Provider>
  );
};

export const useLedgerContext = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error(
      'useLedgerContext must be used within an LedgerContextProvider',
    );
  }
  return context;
};
