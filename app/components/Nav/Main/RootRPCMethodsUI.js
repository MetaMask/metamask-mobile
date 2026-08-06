import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import Engine from '../../../core/Engine';
import WatchAssetApproval from '../../Approvals/WatchAssetApproval';
import AddChainApproval from '../../Approvals/AddChainApproval';
import SwitchChainApproval from '../../Approvals/SwitchChainApproval';
import ConnectApproval from '../../Approvals/ConnectApproval';
import PermissionApproval from '../../Approvals/PermissionApproval';
import FlowLoaderModal from '../../Approvals/FlowLoaderModal';
import TemplateConfirmationModal from '../../Approvals/TemplateConfirmationModal';
import { ConfirmRoot } from '../../../components/Views/confirmations/components/confirm';

import InstallSnapApproval from '../../Approvals/InstallSnapApproval';
import SnapDialogApproval from '../../Snaps/SnapDialogApproval/SnapDialogApproval';
import SnapAccountCustomNameApproval from '../../Approvals/SnapAccountCustomNameApproval';

const RootRPCMethodsUI = (props) => {
  useEffect(
    () =>
      function cleanup() {
        Engine.context.TokensController?.hub?.removeAllListeners();
      },
    [],
  );

  return (
    <React.Fragment>
      <ConfirmRoot />
      <AddChainApproval />
      <SwitchChainApproval />
      <WatchAssetApproval />
      <ConnectApproval navigation={props.navigation} />
      <PermissionApproval navigation={props.navigation} />
      <FlowLoaderModal />
      <TemplateConfirmationModal />
      <InstallSnapApproval />
      <SnapDialogApproval />
      <SnapAccountCustomNameApproval />
    </React.Fragment>
  );
};

RootRPCMethodsUI.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
};

export default RootRPCMethodsUI;
