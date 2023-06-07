interface InstallSnapApprovalArgs {
  requestData: any;
  currentPageInformation: any;
  onConfirm: () => void;
  onCancel: () => void;
  chainId?: string;
}

// eslint-disable-next-line import/prefer-default-export
export type { InstallSnapApprovalArgs };
