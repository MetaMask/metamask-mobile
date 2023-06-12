import React, { useCallback, useState } from 'react';
import {
  InstallSnapApprovalArgs,
  SnapInstallState,
} from './InstallSnapApprovalFlow.types';
import { InstallSnapConnectionRequest } from './components/InstallSnapConnectionRequest';
import { View } from 'react-native';
import { InstallSnapPermissionsRequest } from './components/InstallSnapPermissionsRequest';
import { InstallSnapSuccess } from './components/InstallSnapSuccess';

const InstallSnapApprovalFlow = ({
  requestData,
  onConfirm,
  onCancel,
}: InstallSnapApprovalArgs) => {
  const [installState, setInstallState] = useState<SnapInstallState>(
    SnapInstallState.Confirm,
  );

  const onConfirmNext = useCallback(() => {
    setInstallState(SnapInstallState.AcceptPermissions);
  }, []);

  const onPermissionsConfirm = useCallback(() => {
    // onConfirm();
    setInstallState(SnapInstallState.SnapInstalled);
  }, []);

  const onSnapInstalled = useCallback(() => {
    setInstallState(SnapInstallState.SnapInstalled);
  }, []);

  const renderInstallStep = useCallback(() => {
    switch (installState) {
      case SnapInstallState.Confirm:
        return (
          <InstallSnapConnectionRequest
            requestData={requestData}
            onConfirm={onConfirmNext}
            onCancel={onCancel}
          />
        );
      case SnapInstallState.AcceptPermissions:
        return (
          <InstallSnapPermissionsRequest
            requestData={requestData}
            onConfirm={onPermissionsConfirm}
            onCancel={onCancel}
          />
        );
      case SnapInstallState.SnapInstalled:
        return (
          <InstallSnapSuccess
            requestData={requestData}
            onConfirm={onSnapInstalled}
            onCancel={onCancel}
          />
        );
    }
  }, [
    installState,
    onCancel,
    onConfirmNext,
    onPermissionsConfirm,
    onSnapInstalled,
    requestData,
  ]);

  return <View>{renderInstallStep()}</View>;
};

export default InstallSnapApprovalFlow;
