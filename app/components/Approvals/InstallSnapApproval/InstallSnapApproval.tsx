///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useEffect, useState } from 'react';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest, {
  ApprovalRequestType,
} from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { SnapInstallState } from './InstallSnapApproval.types';
import {
  InstallSnapConnectionRequest,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
  InstallSnapError,
  InstallSnapPermissionsRequest,
  InstallSnapSuccess,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
} from './components';
import { useSelector } from 'react-redux';
import { selectSnapsMetadata, getPermissions } from '../../../selectors/snaps';
import {
  WALLET_SNAP_PERMISSION_KEY,
  stripSnapPrefix,
} from '@metamask/snaps-utils';
import { isObject } from '@metamask/utils';
import { PermissionConstraint } from '@metamask/permission-controller';
import { providerErrors, serializeError } from '@metamask/rpc-errors';
import { RootState } from '../../../reducers';

const InstallSnapApproval = () => {
  const snapsMetadata = useSelector(selectSnapsMetadata);

  const [installState, setInstallState] = useState<
    SnapInstallState | undefined
  >(undefined);
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
  const [installError, setInstallError] = useState<Error | undefined>(
    undefined,
  );
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  const {
    approvalRequest,
    onConfirm: rawOnConfirm,
    onReject: rawOnReject,
  } = useApprovalRequest();

  const onReject = () => {
    // There is a race condition when using modals and showing alerts in WebViews.
    // We explicitly dismiss the modal here to prevent that race condition which causes a crash.
    setInstallState(undefined);
    rawOnReject(
      serializeError(providerErrors.userRejectedRequest()) as unknown as Error,
    );
  };

  const onConfirm = async (...args: Parameters<typeof rawOnConfirm>) => {
    // There is a race condition when using modals and showing alerts in WebViews.
    // We explicitly dismiss the modal here to prevent that race condition which causes a crash.
    setInstallState(undefined);
    await rawOnConfirm(...args);
  };

  const currentPermissions = useSelector((state: RootState) =>
    getPermissions(state, approvalRequest?.origin),
  );

  useEffect(() => {
    if (approvalRequest) {
      if (
        approvalRequest.type === ApprovalTypes.REQUEST_PERMISSIONS &&
        Object.keys(approvalRequest?.requestData?.permissions).includes(
          WALLET_SNAP_PERMISSION_KEY,
        )
      ) {
        setInstallState(SnapInstallState.Confirm);
      } else if (
        approvalRequest.type === ApprovalTypes.INSTALL_SNAP &&
        approvalRequest?.requestState?.permissions
      ) {
        setInstallState(SnapInstallState.AcceptPermissions);
      }
    } else {
      setInstallState(undefined);
    }
  }, [approvalRequest]);

  const getConnectSnapIds = (
    request: ApprovalRequestType,
    permissions?: Record<string, PermissionConstraint>,
  ): string[] => {
    const permission =
      request?.requestData?.permissions?.[WALLET_SNAP_PERMISSION_KEY];
    const requestedSnaps = permission?.caveats[0].value;
    const currentSnaps =
      permissions?.[WALLET_SNAP_PERMISSION_KEY]?.caveats?.[0].value;

    if (!isObject(currentSnaps) && requestedSnaps) {
      return Object.keys(requestedSnaps);
    }

    const requestedSnapKeys = requestedSnaps ? Object.keys(requestedSnaps) : [];
    const currentSnapKeys = currentSnaps ? Object.keys(currentSnaps) : [];
    const dedupedSnaps = requestedSnapKeys.filter(
      (snapId) => !currentSnapKeys.includes(snapId),
    );

    return dedupedSnaps.length > 0 ? dedupedSnaps : requestedSnapKeys;
  };

  const getSnapMetadata = (snapId: string) =>
    snapsMetadata[snapId] ?? { name: stripSnapPrefix(snapId) };

  if (!approvalRequest) return null;

  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)

  const onPermissionsConfirm = async () => {
    try {
      await onConfirm(undefined, {
        ...approvalRequest?.requestData,
        permissions: approvalRequest?.requestState?.permissions,
      });
      setInstallState(SnapInstallState.SnapInstalled);
    } catch (error) {
      setInstallError(error as Error);
      setInstallState(SnapInstallState.SnapInstallError);
    }
  };
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)

  if (!approvalRequest || installState === undefined) return null;

  // In the Snap install stage, only one Snap ID is available.
  const installSnapId = approvalRequest.requestData?.snapId;

  // In the connection stage, multiple IDs are available.
  const connectSnapIds = getConnectSnapIds(approvalRequest, currentPermissions);

  const snapId = installSnapId ?? connectSnapIds[0];

  if (!snapId) {
    return null;
  }

  const snapName = getSnapMetadata(snapId).name;

  // TODO: This component should support connecting to multiple Snaps at once.
  const renderModalContent = () => {
    switch (installState) {
      case SnapInstallState.Confirm:
        return (
          <InstallSnapConnectionRequest
            approvalRequest={approvalRequest}
            snapId={snapId}
            snapName={snapName}
            onConfirm={onConfirm}
            onCancel={onReject}
          />
        );
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
      case SnapInstallState.AcceptPermissions:
        return (
          <InstallSnapPermissionsRequest
            approvalRequest={approvalRequest}
            snapId={snapId}
            snapName={snapName}
            onConfirm={onPermissionsConfirm}
            onCancel={onReject}
          />
        );
      case SnapInstallState.SnapInstalled:
        return <InstallSnapSuccess snapName={snapName} onConfirm={onConfirm} />;
      case SnapInstallState.SnapInstallError:
        return (
          <InstallSnapError
            snapName={snapName}
            onConfirm={onConfirm}
            error={installError}
          />
        );
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      default:
        return null;
    }
  };

  const content = renderModalContent();

  return content ? (
    <ApprovalModal
      isVisible={installState !== undefined}
      onCancel={onReject}
      avoidKeyboard
    >
      {content}
    </ApprovalModal>
  ) : null;
};

export default InstallSnapApproval;
///: END:ONLY_INCLUDE_IF
