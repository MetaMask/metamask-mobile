///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps)
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import { strings } from '../../../../locales/i18n';
import stylesheet from './SnapDialogApproval.styles';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import ApprovalModal from '../../Approvals/ApprovalModal';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Engine from '../../../core/Engine';
import { SnapUIRenderer } from '../SnapUIRenderer/SnapUIRenderer';
import { Json } from '@metamask/snaps-sdk';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';

export enum TemplateConfirmation {
  Ok = 'template_confirmation.ok',
  CANCEL = 'template_confirmation.cancel',
}

const SnapDialogApproval = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(stylesheet, {});

  useEffect(() => {
    setIsDismissed(false);
  }, [approvalRequest]);

  const onCancel = async () => {
    if (!approvalRequest) return;

    // There is a race condition when using modals and showing alerts in WebViews.
    // We explicitly dismiss the modal here to prevent that race condition which causes a crash.
    setIsDismissed(true);
    await Engine.acceptPendingApproval(
      approvalRequest.id,
      null as unknown as Record<string, Json>,
    );
    await Engine.context.SnapInterfaceController.deleteInterface(
      approvalRequest.id,
    );
  };

  const onConfirm = async () => {
    if (!approvalRequest) return;

    // There is a race condition when using modals and showing alerts in WebViews.
    // We explicitly dismiss the modal here to prevent that race condition which causes a crash.
    setIsDismissed(true);
    await Engine.acceptPendingApproval(
      approvalRequest.id,
      true as unknown as Record<string, Json>,
    );
    await Engine.context.SnapInterfaceController.deleteInterface(
      approvalRequest.id,
    );
  };

  const onReject = async () => {
    if (!approvalRequest) return;

    // There is a race condition when using modals and showing alerts in WebViews.
    // We explicitly dismiss the modal here to prevent that race condition which causes a crash.
    setIsDismissed(true);
    await Engine.acceptPendingApproval(
      approvalRequest.id,
      false as unknown as Record<string, Json>,
    );
    await Engine.context.SnapInterfaceController.deleteInterface(
      approvalRequest.id,
    );
  };

  if (isDismissed) {
    return null;
  }

  if (
    approvalRequest?.type !== DIALOG_APPROVAL_TYPES.alert &&
    approvalRequest?.type !== DIALOG_APPROVAL_TYPES.confirmation &&
    approvalRequest?.type !== DIALOG_APPROVAL_TYPES.default
  )
    return null;

  const getDialogButtons = (type: string | undefined) => {
    switch (type) {
      case DIALOG_APPROVAL_TYPES.alert:
        return [
          {
            variant: ButtonVariants.Primary,
            label: strings(TemplateConfirmation.Ok),
            size: ButtonSize.Lg,
            onPress: onCancel,
          },
        ];

      case DIALOG_APPROVAL_TYPES.confirmation:
        return [
          {
            variant: ButtonVariants.Secondary,
            label: strings(TemplateConfirmation.CANCEL),
            size: ButtonSize.Lg,
            onPress: onReject,
          },
          {
            variant: ButtonVariants.Primary,
            label: strings('transactions.approve'),
            size: ButtonSize.Lg,
            onPress: onConfirm,
          },
        ];
      default:
        return [];
    }
  };

  const buttons = getDialogButtons(approvalRequest?.type);
  const snapId = approvalRequest?.origin;
  const interfaceId = approvalRequest?.requestData?.id;

  return (
    <ApprovalModal
      isVisible={
        approvalRequest?.type === DIALOG_APPROVAL_TYPES.alert ||
        approvalRequest?.type === DIALOG_APPROVAL_TYPES.confirmation ||
        approvalRequest?.type === DIALOG_APPROVAL_TYPES.default
      }
      onCancel={onCancel}
      avoidKeyboard
    >
      <View style={styles.root}>
        <SnapUIRenderer
          snapId={snapId}
          interfaceId={interfaceId}
          onCancel={onCancel}
          useFooter={approvalRequest?.type === DIALOG_APPROVAL_TYPES.default}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            marginBottom:
              approvalRequest?.type !== DIALOG_APPROVAL_TYPES.default ? 80 : 0,
          }}
        />
        {approvalRequest?.type !== DIALOG_APPROVAL_TYPES.default && (
          <BottomSheetFooter
            style={styles.footer}
            buttonsAlignment={ButtonsAlignment.Horizontal}
            buttonPropsArray={buttons}
          />
        )}
      </View>
    </ApprovalModal>
  );
};

export default SnapDialogApproval;
///: END:ONLY_INCLUDE_IF
