import React, {
  ReactElement,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CONFIRMATION_EVENT_LOCATIONS } from '../../../../../core/Analytics/events/confirmations';
import { useTransactionMetadataRequest } from '../../hooks/useTransactionMetadataRequest';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { determineConfirmationLocation } from './helpers';

interface ConfirmContextType {
  location?: CONFIRMATION_EVENT_LOCATIONS;
}

export const ConfirmContext = createContext<ConfirmContextType>({
  location: undefined,
});

export const ConfirmContextProvider = ({
  children,
}: {
  children: ReactElement;
}) => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMeta = useTransactionMetadataRequest();

  // Keep the initial location for component mount
  const initialLocation = determineConfirmationLocation({
    approvalRequest,
    transactionMeta,
  });
  const [location, setLocation] = useState<
    CONFIRMATION_EVENT_LOCATIONS | undefined
  >(initialLocation);

  useEffect(() => {
    const determinedLocation = determineConfirmationLocation({
      approvalRequest,
      transactionMeta,
    });
    setLocation(determinedLocation);
  }, [approvalRequest, transactionMeta]);

  return (
    <ConfirmContext.Provider value={{ location }}>
      {children}
    </ConfirmContext.Provider>
  );
};

export const useConfirmContext = () => useContext(ConfirmContext);
