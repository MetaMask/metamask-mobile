///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps)
import React, { useState } from 'react';
import { useStyles } from '../../../hooks/useStyles';
import { strings } from '../../../../../locales/i18n';
import stylesheet from './SnapDialogApproval.styles';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { View } from 'react-native-animatable';
import ApprovalModal from '../../ApprovalModal';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Engine from '../../../../core/Engine';
import { SnapUIRenderer } from '../SnapUIRenderer/SnapUIRenderer';

enum SnapDialogTypes {
  ALERT = 'snap_dialog:alert',
  CONFIRM = 'snap_dialog:confirmation',
  PROMPT = 'snap_dialog:prompt',
  CUSTOM = 'snap_dialog',
}

enum TemplateConfirmation {
  Ok = 'template_confirmation.ok',
  CANCEL = 'template_confirmation.cancel',
}

const SnapDialogApproval = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { approvalRequest } = useApprovalRequest();
  console.log('approvalRequest', approvalRequest);
  const { styles } = useStyles(stylesheet, {});

  const onCancel = async () => {
    if (!approvalRequest) return;

    await Engine.acceptPendingApproval(approvalRequest.id, null as any);
  };

  const onConfirm = async () => {
    if (!approvalRequest) return;

    await Engine.acceptPendingApproval(approvalRequest.id, true as any);
  };

  const onReject = async () => {
    if (!approvalRequest) return;

    await Engine.acceptPendingApproval(approvalRequest.id, false as any);
  };

  if (
    approvalRequest?.type !== SnapDialogTypes.ALERT &&
    approvalRequest?.type !== SnapDialogTypes.CONFIRM &&
    approvalRequest?.type !== SnapDialogTypes.PROMPT &&
    approvalRequest?.type !== SnapDialogTypes.CUSTOM
  )
    return null;

  const getDialogButtons = (type: SnapDialogTypes | undefined) => {
    switch (type) {
      case SnapDialogTypes.ALERT:
        return [
          {
            variant: ButtonVariants.Primary,
            label: strings(TemplateConfirmation.Ok),
            size: ButtonSize.Lg,
            onPress: onCancel,
          },
        ];

      case SnapDialogTypes.CONFIRM:
        return [
          {
            variant: ButtonVariants.Secondary,
            label: strings(TemplateConfirmation.CANCEL),
            size: ButtonSize.Lg,
            onPress: onReject,
          },
          {
            variant: ButtonVariants.Primary,
            label: strings(TemplateConfirmation.Ok),
            size: ButtonSize.Lg,
            onPress: onConfirm,
          },
        ];
      case SnapDialogTypes.PROMPT:
      case SnapDialogTypes.CUSTOM:
        return [
          {
            variant: ButtonVariants.Secondary,
            label: strings(TemplateConfirmation.CANCEL),
            size: ButtonSize.Lg,
            onPress: onCancel,
          },
          {
            variant: ButtonVariants.Primary,
            label: strings(TemplateConfirmation.Ok),
            size: ButtonSize.Lg,
            onPress: onConfirm,
          },
        ];

      default:
        return [];
    }
  };

  const buttons = getDialogButtons(approvalRequest?.type);

  // snapId = npm:@metamask/dialog-example-snap
  const snapId = approvalRequest?.origin;

  //  approvalRequest {
  //   "expectsResult": false,
  //   "id": "5B4zPSmELsWAEyZ3ZO0ks",
  //   "origin": "npm:@metamask/dialog-example-snap",
  //   "requestData": {"id": "Tg79EdkJkZV0LQynItocD", "placeholder": "This is shown in the input."},
  //   "requestState": null,
  //   "time": 1732896778870,
  //   "type": "snap_dialog"
  // }

  const interfaceId = approvalRequest?.requestData?.id;

  return (
    <ApprovalModal
      isVisible={
        approvalRequest?.type === SnapDialogTypes.ALERT ||
        approvalRequest?.type === SnapDialogTypes.CONFIRM ||
        approvalRequest?.type === SnapDialogTypes.PROMPT ||
        approvalRequest?.type === SnapDialogTypes.CUSTOM
      }
      onCancel={onCancel}
    >
      <View style={styles.root}>
        <SnapUIRenderer
          snapId={snapId}
          interfaceId={interfaceId}
          isLoading={isLoading}
        />
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
