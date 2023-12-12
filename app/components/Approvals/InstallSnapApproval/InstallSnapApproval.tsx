///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { useEffect, useState, useMemo } from 'react';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import Logger from '../../../util/Logger';
import { SnapInstallState } from './InstallSnapApproval.types';
import {
  InstallSnapConnectionRequest,
  InstallSnapError,
  InstallSnapPermissionsRequest,
  InstallSnapSuccess,
} from './components';
import { SNAP_INSTALL_FLOW } from './InstallSnapApproval.constants';

const InstallSnapApproval = () => {
  const [installState, setInstallState] = useState<
    SnapInstallState | undefined
  >(undefined);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [installError, setInstallError] = useState<Error | undefined>(
    undefined,
  );
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  useEffect(() => {
    if (approvalRequest) {
      if (approvalRequest.type === ApprovalTypes.REQUEST_PERMISSIONS) {
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

  const onInstallSnapFinished = () => {
    setIsFinished(true);
  };

  const onPermissionsConfirm = async () => {
    try {
      await onConfirm(undefined, {
        ...approvalRequest?.requestData,
        permissions: approvalRequest?.requestState?.permissions,
      });
      setInstallState(SnapInstallState.SnapInstalled);
    } catch (error) {
      Logger.error(
        error as Error,
        `${SNAP_INSTALL_FLOW} Failed to install snap`,
      );
      setInstallError(error as Error);
      setInstallState(SnapInstallState.SnapInstallError);
    }
  };

  const snapName = useMemo(() => {
    // First, try to get the snapName from the approvalRequest data if it is there.
    const colonIndex = approvalRequest?.requestData.snapId.indexOf(':');
    if (colonIndex !== -1) {
      return approvalRequest?.requestData.snapId.substring(colonIndex + 1);
    }

    // If the above isn't found, then try to get the snap name from caveats
    const snapIdsCaveat =
      approvalRequest?.requestData?.permissions?.wallet_snap?.caveats?.find(
        (c: any) => c.type === 'snapIds',
      );
    const snapNameFromCaveats = snapIdsCaveat?.value
      ? Object.keys(snapIdsCaveat.value)[0]
      : '';

    // Return snap name from caveats or an empty string if not found
    return snapNameFromCaveats;
  }, [
    approvalRequest?.requestData.snapId,
    approvalRequest?.requestData?.permissions?.wallet_snap?.caveats,
  ]);

  if (!approvalRequest) return null;

  const renderModalContent = () => {
    switch (installState) {
      case SnapInstallState.Confirm:
        return (
          <InstallSnapConnectionRequest
            approvalRequest={approvalRequest}
            snapName={snapName}
            onConfirm={onConfirm}
            onCancel={onReject}
          />
        );
      case SnapInstallState.AcceptPermissions:
        return (
          <InstallSnapPermissionsRequest
            approvalRequest={approvalRequest}
            snapName={snapName}
            onConfirm={onPermissionsConfirm}
            onCancel={onReject}
          />
        );
      case SnapInstallState.SnapInstalled:
        return (
          <InstallSnapSuccess
            snapName={snapName}
            onConfirm={onInstallSnapFinished}
          />
        );
      case SnapInstallState.SnapInstallError:
        return (
          <InstallSnapError
            snapName={snapName}
            onConfirm={onInstallSnapFinished}
            error={installError}
          />
        );
      default:
        return null;
    }
  };

  const content = renderModalContent();

  return content ? (
    <ApprovalModal
      isVisible={installState !== undefined && !isFinished}
      onCancel={onReject}
    >
      {content}
    </ApprovalModal>
  ) : null;
};

export default InstallSnapApproval;
///: END:ONLY_INCLUDE_IF
