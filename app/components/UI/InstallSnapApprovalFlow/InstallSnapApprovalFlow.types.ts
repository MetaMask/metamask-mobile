interface InstallSnapApprovalArgs {
  requestData: any;
  onConfirm: () => void;
  onCancel: () => void;
  chainId?: string;
}

export enum SnapInstallState {
  Confirm = 'Confirm',
  AcceptPermissions = 'AcceptPermissions',
  SnapInstalled = 'SnapInstalled',
  SnapInstallError = 'SnapInstallError',
}

// eslint-disable-next-line import/prefer-default-export
export type { InstallSnapApprovalArgs };
