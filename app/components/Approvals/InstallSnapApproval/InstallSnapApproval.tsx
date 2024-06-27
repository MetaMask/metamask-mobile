///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React, { useEffect, useState } from 'react';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
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
import { ApprovalRequest } from '@metamask/approval-controller';

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

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSnapName = (request: ApprovalRequest<any>): string => {
    // We first look for the name inside the snapId approvalRequest data
    const snapId = request?.requestData?.snapId;
    if (typeof snapId === 'string') {
      const colonIndex = snapId.indexOf(':');
      if (colonIndex !== -1) {
        return snapId.substring(colonIndex + 1);
      }
    }
    // If there is no snapId present in the approvalRequest data, we look for the name inside the snapIds caveat
    const snapIdsCaveat =
      request?.requestData?.permissions?.wallet_snap?.caveats?.find(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => c.type === 'snapIds',
      );
    // return an empty string if we can't find the snap name in the approvalRequest data
    return snapIdsCaveat?.value ? Object.keys(snapIdsCaveat.value)[0] : '';
  };

  if (!approvalRequest) return null;

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

  if (!approvalRequest) return null;

  const snapName = getSnapName(approvalRequest);

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
