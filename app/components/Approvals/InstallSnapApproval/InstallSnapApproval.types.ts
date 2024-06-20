///: BEGIN:ONLY_INCLUDE_IF(snaps)
interface InstallSnapFlowProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
