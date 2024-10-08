import { USER_INTENT } from '../../../constants/permissions';

export interface PermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  requestData: unknown;
  onEdit?: () => void;
  onEditNetworks?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onUserAction?: React.Dispatch<React.SetStateAction<USER_INTENT>>;
  showActionButtons?: boolean;
  isAlreadyConnected?: boolean;
  isRenderedAsBottomSheet?: boolean;
  isDisconnectAllShown?: boolean;
  isNetworkSwitch?: boolean;
  customNetworkInformation: {
    chainName: string;
  };
}
