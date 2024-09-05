import { AccountConnectScreens } from '../../../components/Views/AccountConnect/AccountConnect.types';
import { USER_INTENT } from '../../../constants/permissions';

export interface PermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  onSetScreen?: (screen: AccountConnectScreens) => void;
  onUserAction?: React.Dispatch<React.SetStateAction<USER_INTENT>>;
}
