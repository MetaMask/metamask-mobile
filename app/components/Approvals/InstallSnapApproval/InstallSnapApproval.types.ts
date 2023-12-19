///: BEGIN:ONLY_INCLUDE_IF(snaps)
interface InstallSnapFlowProps {
  approvalRequest: any;
  snapName: string;
  onConfirm: () => void;
  onCancel: () => void;
  chainId?: string;
  error?: Error;
}

export enum SnapInstallState {
  Confirm = 'Confirm',
  AcceptPermissions = 'AcceptPermissions',
  SnapInstalled = 'SnapInstalled',
  SnapInstallError = 'SnapInstallError',
}

// eslint-disable-next-line import/prefer-default-export
export type { InstallSnapFlowProps };
///: END:ONLY_INCLUDE_IF
