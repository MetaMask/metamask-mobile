import React, { useEffect, useState } from 'react';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import Logger from '../../../util/Logger';
import { SNAP_INSTALL_FLOW } from '../../../constants/test-ids';
import { SnapInstallState } from './InstallSnapApproval.types';
import {
  InstallSnapConnectionRequest,
  InstallSnapError,
  InstallSnapPermissionsRequest,
  InstallSnapSuccess,
} from './components';

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
        approvalRequest.requestState.permissions
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
        ...approvalRequest.requestData,
        permissions: approvalRequest.requestState.permissions,
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

  const renderModalContent = () => {
    switch (installState) {
      case SnapInstallState.Confirm:
        return (
          <InstallSnapConnectionRequest
            approvalRequest={approvalRequest}
            onConfirm={onConfirm}
            onCancel={onReject}
          />
        );
      case SnapInstallState.AcceptPermissions:
        return (
          <InstallSnapPermissionsRequest
            approvalRequest={approvalRequest}
            requestState={approvalRequest.requestState}
            onConfirm={onPermissionsConfirm}
            onCancel={onReject}
          />
        );
      case SnapInstallState.SnapInstalled:
        return (
          <InstallSnapSuccess
            approvalRequest={approvalRequest}
            onConfirm={onInstallSnapFinished}
          />
        );
      case SnapInstallState.SnapInstallError:
        return (
          <InstallSnapError
            approvalRequest={approvalRequest}
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
