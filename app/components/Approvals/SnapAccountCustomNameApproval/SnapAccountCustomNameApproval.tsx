///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import { useSelector } from 'react-redux';
import { selectSnapsMetadata } from '../../../selectors/snaps/snapController';

const SnapAccountCustomNameApproval = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  console.log(
    'SnapKeyring: SnapAccountCustomNameApproval',
    approvalRequest?.type,
  );

  return (
    <ApprovalModal
      isVisible={
        approvalRequest?.type ===
        SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount
      }
      onCancel={onReject}
    >
      <Text>Snap Account Custom Name Approval</Text>
    </ApprovalModal>
  );
};

export default SnapAccountCustomNameApproval;
///: END:ONLY_INCLUDE_IF
