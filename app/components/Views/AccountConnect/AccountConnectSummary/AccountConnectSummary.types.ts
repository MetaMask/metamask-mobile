export interface AccountConnectSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  isNonDappNetworkSwitch?: boolean;
  showActionButtons?: boolean;
  isNetworkSwitch?: boolean;
  accountAddresses?: string[];
}
