import React from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import NetworkVerificationInfo from '../../UI/NetworkVerificationInfo';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../component-library/hooks';
import { View } from 'react-native';

// Internal dependencies
import styleSheet from './AddChainApproval.styles';

const AddChainApproval = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

  if (approvalRequest?.type !== ApprovalTypes.ADD_ETHEREUM_CHAIN) return null;

  return (
    <BottomSheet onClose={onReject} shouldNavigateBack={false}>
      <View style={styles.actionsContainer}>
        <NetworkVerificationInfo
          customNetworkInformation={approvalRequest?.requestData}
          onReject={onReject}
          onConfirm={onConfirm}
        />
      </View>
    </BottomSheet>
  );
};

export default AddChainApproval;
