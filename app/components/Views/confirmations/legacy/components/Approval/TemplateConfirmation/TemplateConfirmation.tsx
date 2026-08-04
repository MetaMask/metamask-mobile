import React, { useEffect, useMemo } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import TemplateRenderer from '../../../../../../UI/TemplateRenderer';
import { ConfirmationTemplateValues, getTemplateValues } from './Templates';
import { useStyles } from '../../../../../../hooks/useStyles';
import stylesheet from './TemplateConfirmation.styles';
import { View } from 'react-native-animatable';
import {
  BottomSheetFooter,
  ButtonSize,
  ButtonsAlignment,
} from '@metamask/design-system-react-native';
import { useAppThemeFromContext } from '../../../../../../../util/theme';
import { AcceptOptions, ApprovalRequest } from '@metamask/approval-controller';

export interface TemplateConfirmationProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approvalRequest: ApprovalRequest<any>;
  onConfirm: (opts?: AcceptOptions) => void;
  onCancel: () => void;
}

export interface Actions {
  onConfirm: (opts?: AcceptOptions) => void;
  onCancel: () => void;
}

const TemplateConfirmation = ({
  approvalRequest,
  onConfirm,
  onCancel,
}: TemplateConfirmationProps) => {
  const { styles } = useStyles(stylesheet, {});
  const { colors } = useAppThemeFromContext();

  const templatedValues = useMemo<Partial<ConfirmationTemplateValues>>(
    () =>
      approvalRequest
        ? getTemplateValues(
            {
              ...approvalRequest,
            },
            strings,
            { onConfirm, onCancel },
            colors,
          )
        : {},
    [approvalRequest, onConfirm, onCancel, colors],
  );

  useEffect(() => {
    // Handles the cancellation logic
    const handleOnCancel = () => {
      templatedValues.onCancel ? templatedValues.onCancel() : onCancel();
    };
    // unmount handler when the modal is closed by swipe down. This allows
    // the template to inject its own logic when the cancellation occurs
    return () => {
      handleOnCancel();
    };
  }, [templatedValues.onCancel, onCancel, templatedValues]);

  const showPrimary = !templatedValues.hideSubmitButton;
  const showSecondary = !templatedValues.hideCancelButton;

  if (!showPrimary && !showSecondary) {
    return (
      <View style={styles.root}>
        <TemplateRenderer sections={templatedValues.content} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TemplateRenderer sections={templatedValues.content} />
      <View style={styles.actionContainer}>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          primaryButtonProps={
            showPrimary
              ? {
                  children:
                    templatedValues.confirmText ??
                    strings('template_confirmation.ok'),
                  size: ButtonSize.Lg,
                  onPress: templatedValues.onConfirm ?? onConfirm,
                }
              : undefined
          }
          secondaryButtonProps={
            showSecondary
              ? {
                  children:
                    templatedValues.cancelText ??
                    strings('template_confirmation.cancel'),
                  size: ButtonSize.Lg,
                  onPress: templatedValues.onCancel ?? onCancel,
                }
              : undefined
          }
        />
      </View>
    </View>
  );
};

export default TemplateConfirmation;
