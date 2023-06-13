import React, { useCallback, useState } from 'react';
import {
  InstallSnapApprovalArgs,
  SnapInstallState,
} from './InstallSnapApprovalFlow.types';
import { InstallSnapConnectionRequest } from './components/InstallSnapConnectionRequest';
import { View } from 'react-native';
import { InstallSnapPermissionsRequest } from './components/InstallSnapPermissionsRequest';
import { InstallSnapSuccess } from './components/InstallSnapSuccess';
import { InstallSnapError } from './components/InstallSnapError';
import { SNAP_INSTALL_FLOW } from '../../../constants/test-ids';
import Logger from '../../../util/Logger';

const InstallSnapApprovalFlow = ({
  requestData,
  onConfirm,
  onFinish,
  onCancel,
}: InstallSnapApprovalArgs) => {
  const [installState, setInstallState] = useState<SnapInstallState>(
    SnapInstallState.Confirm,
  );

  const [installError, setInstallError] = useState<Error | undefined>(
    undefined,
  );

  const onConfirmNext = useCallback(() => {
    setInstallState(SnapInstallState.AcceptPermissions);
  }, []);

  const onPermissionsConfirm = useCallback(() => {
    try {
      onConfirm();
    } catch (error) {
      Logger.error(
        error as Error,
        `${SNAP_INSTALL_FLOW} Failed to install snap`,
      );
      setInstallError(error as Error);
      setInstallState(SnapInstallState.SnapInstallError);
    }
    setInstallState(SnapInstallState.SnapInstalled);
  }, [onConfirm]);

  const onSnapInstalled = useCallback(() => {
    onFinish();
  }, [onFinish]);

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
      case SnapInstallState.SnapInstallError:
        return (
          <InstallSnapError
            requestData={requestData}
            onConfirm={onSnapInstalled}
            onCancel={onCancel}
            error={installError}
          />
        );
    }
  }, [
    installError,
    installState,
    onCancel,
    onConfirmNext,
    onPermissionsConfirm,
    onSnapInstalled,
    requestData,
  ]);

  return <View testID={SNAP_INSTALL_FLOW}>{renderInstallStep()}</View>;
};

export default InstallSnapApprovalFlow;
