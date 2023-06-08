import React from 'react';
import { InstallSnapApprovalArgs } from './InstallSnapApprovalFlow.types';
import InstallSnapConnectionRequest from './components/InstallSnapConnectionRequest/InstallSnapConnectionRequest';
import { View } from 'react-native';

const InstallSnapApprovalFlow = ({
  requestData,
  onConfirm,
  onCancel,
}: InstallSnapApprovalArgs) => (
  <View>
    <InstallSnapConnectionRequest
      requestData={requestData}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  </View>
);

export default InstallSnapApprovalFlow;
