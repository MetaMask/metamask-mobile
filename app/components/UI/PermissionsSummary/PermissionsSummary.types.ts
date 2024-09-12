import { USER_INTENT } from '../../../constants/permissions';

export interface PermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  onEdit?: () => void;
  onBack?: () => void;
  onUserAction?: React.Dispatch<React.SetStateAction<USER_INTENT>>;
  showHeader?: boolean;
  showActionButtons?: boolean;
  isInitialDappConnection?: boolean;
  isAlreadyConnected?: boolean;
}
