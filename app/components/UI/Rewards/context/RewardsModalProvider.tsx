import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from 'react';
import RewardOptInAccountGroupModal from '../components/Settings/RewardOptInAccountGroupModal';
import { AccountGroupId } from '@metamask/account-api';

// Modal types that can be shown
export enum RewardsModalType {
  ACCOUNT_GROUP_OPTIN = 'ACCOUNT_GROUP_OPTIN',
  // Add more modal types here as we convert them
}

// Props for each modal type
export interface RewardsModalProps {
  [RewardsModalType.ACCOUNT_GROUP_OPTIN]: {
    accountGroupId: AccountGroupId;
    autoLink?: boolean;
  };
  // Add more modal props here
}

// Context value interface
interface RewardsModalContextValue {
  showModal: <T extends RewardsModalType>(
    type: T,
    props: RewardsModalProps[T],
  ) => void;
  hideModal: () => void;
  isModalVisible: boolean;
  activeModalType: RewardsModalType | null;
}

// Create context
const RewardsModalContext = createContext<RewardsModalContextValue | undefined>(
  undefined,
);

// Provider props
interface RewardsModalProviderProps {
  children: ReactNode;
}

// Modal renderer component
const RewardsModalRenderer: React.FC<{
  type: RewardsModalType;
  props: RewardsModalProps[RewardsModalType];
  onClose: () => void;
}> = ({ type, props, onClose }) => {
  switch (type) {
    case RewardsModalType.ACCOUNT_GROUP_OPTIN:
      return (
        <RewardOptInAccountGroupModal
          accountGroupId={props.accountGroupId}
          onClose={onClose}
          autoLink={props.autoLink}
        />
      );
    default:
      return null;
  }
};

// Combined modal state for atomic updates
interface ModalState {
  type: RewardsModalType | null;
  props: RewardsModalProps[RewardsModalType] | null;
}

// Provider component
export const RewardsModalProvider: React.FC<RewardsModalProviderProps> = ({
  children,
}) => {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    props: null,
  });

  const showModal = useCallback(
    <T extends RewardsModalType>(type: T, props: RewardsModalProps[T]) => {
      setModalState({ type, props });
    },
    [],
  );

  const hideModal = useCallback(() => {
    setModalState({ type: null, props: null });
  }, []);

  const isModalVisible = modalState.type !== null;

  const contextValue: RewardsModalContextValue = {
    showModal,
    hideModal,
    isModalVisible,
    activeModalType: modalState.type,
  };

  return (
    <RewardsModalContext.Provider value={contextValue}>
      {children}
      {/* Render active modal as overlay */}
      {isModalVisible && modalState.type && modalState.props && (
        <RewardsModalRenderer
          type={modalState.type}
          props={modalState.props}
          onClose={hideModal}
        />
      )}
    </RewardsModalContext.Provider>
  );
};

// Hook to use the context
export const useRewardsModal = (): RewardsModalContextValue => {
  const context = useContext(RewardsModalContext);
  if (!context) {
    throw new Error(
      'useRewardsModal must be used within a RewardsModalProvider',
    );
  }
  return context;
};

// Helper hook for specific modal types
export const useRewardsAccountGroupModal = () => {
  const { showModal } = useRewardsModal();

  const showAccountGroupModal = useCallback(
    (accountGroupId: AccountGroupId, autoLink?: boolean) => {
      showModal(RewardsModalType.ACCOUNT_GROUP_OPTIN, {
        accountGroupId,
        autoLink,
      });
    },
    [showModal],
  );

  return {
    showAccountGroupModal,
  };
};
