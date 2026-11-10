import React from 'react';
import PropTypes from 'prop-types';

import WatchAssetApproval from '../../Approvals/WatchAssetApproval';
import AddChainApproval from '../../Approvals/AddChainApproval';
import SwitchChainApproval from '../../Approvals/SwitchChainApproval';
import ConnectApproval from '../../Approvals/ConnectApproval';
import PermissionApproval from '../../Approvals/PermissionApproval';
import FlowLoaderModal from '../../Approvals/FlowLoaderModal';
import TemplateConfirmationModal from '../../Approvals/TemplateConfirmationModal';
import ConfirmMembershipApproval from '../../Approvals/ConfirmMembershipApproval';
import { ConfirmRoot } from '../../../components/Views/confirmations/components/confirm';

import InstallSnapApproval from '../../Approvals/InstallSnapApproval';
import SnapDialogApproval from '../../Snaps/SnapDialogApproval/SnapDialogApproval';
import SnapAccountCustomNameApproval from '../../Approvals/SnapAccountCustomNameApproval';

const RootRPCMethodsUI = (props) => (
  <React.Fragment>
    <ConfirmRoot />
    <AddChainApproval />
    <SwitchChainApproval />
    <WatchAssetApproval />
    <ConnectApproval navigation={props.navigation} />
    <PermissionApproval navigation={props.navigation} />
    <FlowLoaderModal />
    <TemplateConfirmationModal />
    <ConfirmMembershipApproval />
    <InstallSnapApproval />
    <SnapDialogApproval />
    <SnapAccountCustomNameApproval />
  </React.Fragment>
);

RootRPCMethodsUI.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
};

export default RootRPCMethodsUI;
