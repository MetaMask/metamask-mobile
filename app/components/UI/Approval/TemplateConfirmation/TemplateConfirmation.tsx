import React, { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import TemplateRenderer from '../../TemplateRenderer';
import { getTemplateValues } from './Templates';
import { useStyles } from '../../../hooks/useStyles';
import stylesheet from './TemplateConfirmation.styles';
import { View } from 'react-native-animatable';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { useAppThemeFromContext } from '../../../../util/theme';
import { ApprovalRequest } from '@metamask/approval-controller';

export interface TemplateConfirmationProps {
  approvalRequest: ApprovalRequest<any>;
  onConfirm: () => void;
  onCancel?: () => void;
}

type Action = () => void;
export interface Actions {
  [key: string]: Action | undefined;
}

const TemplateConfirmation = ({
  approvalRequest,
  onConfirm,
  onCancel,
}: TemplateConfirmationProps) => {
  const { styles } = useStyles(stylesheet, {});
  const { colors } = useAppThemeFromContext();

  const templatedValues = useMemo(
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

  const buttons = [
    {
      variant: ButtonVariants.Primary,
      label: templatedValues.submitText ?? strings('template_confirmation.ok'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
    },
  ];

  if (onCancel) {
    buttons.push({
      variant: ButtonVariants.Secondary,
      label:
        templatedValues.cancelText ?? strings('template_confirmation.cancel'),
      size: ButtonSize.Lg,
      onPress: onCancel,
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
