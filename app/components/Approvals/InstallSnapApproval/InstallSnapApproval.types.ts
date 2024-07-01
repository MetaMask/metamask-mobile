///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
interface InstallSnapFlowProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approvalRequest: any;
  snapId: string;
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
  SnapInstallFinished = 'SnapInstallFinished',
}

// eslint-disable-next-line import/prefer-default-export
export type { InstallSnapFlowProps };
///: END:ONLY_INCLUDE_IF
