import { USER_INTENT } from '../../../constants/permissions';

export interface PermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  onEdit: () => void;
  onUserAction?: React.Dispatch<React.SetStateAction<USER_INTENT>>;
}
