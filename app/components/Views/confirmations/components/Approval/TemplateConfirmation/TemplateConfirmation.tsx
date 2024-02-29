import React, { useEffect, useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import TemplateRenderer from '../../../../../UI/TemplateRenderer';
import { ConfirmationTemplateValues, getTemplateValues } from './Templates';
import { useStyles } from '../../../../../hooks/useStyles';
import stylesheet from './TemplateConfirmation.styles';
import { View } from 'react-native-animatable';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { useAppThemeFromContext } from '../../../../../../util/theme';
import { AcceptOptions, ApprovalRequest } from '@metamask/approval-controller';
import { useNavigation } from '@react-navigation/native';

export interface TemplateConfirmationProps {
  approvalRequest: ApprovalRequest<any>;
  onConfirm: (opts?: AcceptOptions) => void;
  onCancel: () => void;
}

export interface Actions {
  onConfirm: (opts?: AcceptOptions) => void;
  onCancel: () => void;
  navigation: ReturnType<typeof useNavigation>;
}

const TemplateConfirmation = ({
  approvalRequest,
  onConfirm,
  onCancel,
}: TemplateConfirmationProps) => {
  const { styles } = useStyles(stylesheet, {});
  const { colors } = useAppThemeFromContext();
  const navigation = useNavigation();

  const templatedValues = useMemo<Partial<ConfirmationTemplateValues>>(
    () =>
      approvalRequest
        ? getTemplateValues(
            {
              ...approvalRequest,
            },
            strings,
            { onConfirm, onCancel, navigation },
            colors,
          )
        : {},
    [approvalRequest, onConfirm, onCancel, colors, navigation],
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

  const buttons = [
    {
      variant: ButtonVariants.Primary,
      label: templatedValues.confirmText ?? strings('template_confirmation.ok'),
      size: ButtonSize.Lg,
      onPress: templatedValues.onConfirm ?? onConfirm,
    },
  ];

  if (!templatedValues.onlyConfirmButton) {
    buttons.push({
      variant: ButtonVariants.Secondary,
      label:
        templatedValues.cancelText ?? strings('template_confirmation.cancel'),
      size: ButtonSize.Lg,
      onPress: templatedValues.onCancel ?? onCancel,
    });
  }

  return (
    <View style={styles.root}>
      <TemplateRenderer sections={templatedValues.content} />
      <View style={styles.actionContainer}>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={buttons}
        />
      </View>
    </View>
  );
};

export default TemplateConfirmation;
