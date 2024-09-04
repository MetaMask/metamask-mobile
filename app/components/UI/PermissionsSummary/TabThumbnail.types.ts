export interface PermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  onConfirm?: () => void;
  onCancel?: () => void;
  customNetworkInformation: {
    chainName: string;
  };
}
