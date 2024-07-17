///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { useCallback } from 'react';
import { useStyles } from '../../../hooks/useStyles';
import { strings } from '../../../../../locales/i18n';
import stylesheet from './SnapDialogApproval.styles';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { View } from 'react-native-animatable';
import ApprovalModal from '../../ApprovalModal';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { SnapUIRenderer } from '../../../UI/Snaps/SnapUIRenderer/SnapUIRenderer';
import Engine from '../../../../core/Engine';

const SnapDialogApproval = () => {
  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(stylesheet, {});

  const onConfirm = useCallback(async () => {
    if (!approvalRequest) return;

    await Engine.acceptPendingApproval(approvalRequest.id, true as any);
  }, [approvalRequest]);

  const onReject = useCallback(async () => {
    if (!approvalRequest) return;

    await Engine.acceptPendingApproval(approvalRequest.id, false as any);
  }, [approvalRequest]);

  if (
    approvalRequest?.type !== ApprovalTypes.SNAP_DIALOG ||
    !approvalRequest?.requestData?.content
  )
    return null;

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('template_confirmation.cancel'),
      size: ButtonSize.Lg,
      onPress: onReject,
    },
    {
      variant: ButtonVariants.Primary,
      label: strings('template_confirmation.ok'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
    },
  ];

  const snapId = approvalRequest.origin;
  const interfaceId = approvalRequest.requestData.content;

  return (
    <ApprovalModal isVisible onCancel={onReject}>
      <View style={styles.root}>
        <SnapUIRenderer snapId={snapId} interfaceId={interfaceId} />
        <View style={styles.actionContainer}>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Horizontal}
            buttonPropsArray={buttons}
          />
        </View>
      </View>
    </ApprovalModal>
  );
};

export default SnapDialogApproval;
///: END:ONLY_INCLUDE_IF
