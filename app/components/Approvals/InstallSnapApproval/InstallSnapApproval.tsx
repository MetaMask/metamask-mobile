import React, { useCallback, useState } from 'react';
import { InstallSnapApprovalFlow } from '../../UI/InstallSnapApprovalFlow';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import { View } from 'react-native';

const InstallSnapApproval = () => {
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  // console.log('SNAPS/ approvalRequest', JSON.stringify(approvalRequest));

  const onInstallSnapFinished = () => {
    setIsFinished(true);
  };

  // const isWalletRequestPermissions =
  //   approvalRequest.type === ApprovalTypes.REQUEST_PERMISSIONS &&
  //   approvalRequest.requestData?.snapId;

  // const onPermissionsConfirm = useCallback(() => {
  //   try {
  //     onConfirm(undefined, {
  //       ...requestData.requestData,
  //       permissions: requestData.requestState.permissions,
  //     });
  //   } catch (error) {
  //     Logger.error(
  //       error as Error,
  //       `${SNAP_INSTALL_FLOW} Failed to install snap`,
  //     );
  //     setInstallError(error as Error);
  //     setInstallState(SnapInstallState.SnapInstallError);
  //   }
  //   setInstallState(SnapInstallState.SnapInstalled);
  // }, [onConfirm, requestData]);

  const isWalletRequestPermissions =
    approvalRequest?.type === ApprovalTypes.REQUEST_PERMISSIONS;

  const onPermissionsConfirm = useCallback(() => {
    onConfirm(undefined, {
      ...approvalRequest?.requestData.requestData,
      permissions: approvalRequest?.requestData.requestState.permissions,
    });
  }, []);

  if (isWalletRequestPermissions) {
    return (
      <ApprovalModal isVisible={isWalletRequestPermissions} onCancel={onReject}>
        <View style={{ flex: 1 }}>
          <Text>This is a permission request</Text>
          <Button
            variant={ButtonVariants.Primary}
            onPress={() => onPermissionsConfirm}
            label="confirm"
          />
        </View>
      </ApprovalModal>
    );
  }

  const isModalVisible: boolean =
    approvalRequest?.requestData.type === ApprovalTypes.INSTALL_SNAP ||
    (!isFinished && approvalRequest !== undefined);

  return (
    <ApprovalModal isVisible={isModalVisible} onCancel={onReject}>
      <InstallSnapApprovalFlow
        onCancel={onReject}
        onConfirm={onConfirm}
        onFinish={onInstallSnapFinished}
        requestData={approvalRequest}
      />
    </ApprovalModal>
  );
};

export default React.memo(InstallSnapApproval);
