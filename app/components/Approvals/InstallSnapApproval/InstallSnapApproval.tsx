///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useEffect, useState } from 'react';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
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
import { ApprovalRequest } from '@metamask/approval-controller';
import { useSelector } from 'react-redux';
import { selectSnapsMetadata } from '../../../selectors/snaps/snapController';
import {
  WALLET_SNAP_PERMISSION_KEY,
  stripSnapPrefix,
} from '@metamask/snaps-utils';

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
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

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

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSnapId = (request: ApprovalRequest<any>): string => {
    // We first look for the name inside the snapId approvalRequest data
    const snapId = request?.requestData?.snapId;
    if (typeof snapId === 'string') {
      return snapId;
    }
    // If there is no snapId present in the approvalRequest data, we look for the name inside the snapIds caveat
    const snapIdsCaveat =
      request?.requestData?.permissions?.wallet_snap?.caveats?.find(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => c.type === 'snapIds',
      );
    return Object.keys(snapIdsCaveat.value)[0];
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

  const snapId = getSnapId(approvalRequest);
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
    <ApprovalModal isVisible={installState !== undefined} onCancel={onReject}>
      {content}
    </ApprovalModal>
  ) : null;
};

export default InstallSnapApproval;
///: END:ONLY_INCLUDE_IF
