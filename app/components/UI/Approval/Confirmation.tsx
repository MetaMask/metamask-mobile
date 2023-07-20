import React, { useMemo } from 'react';
import { strings } from '../../../../locales/i18n';
import MetamaskTemplateRenderer from '../MetamaskTemplateRenderer';
import { getTemplateValues } from './Templates';
import { useStyles } from '../../hooks/useStyles';
import stylesheet from './Confirmation.styles';
import { View } from 'react-native-animatable';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { useAppThemeFromContext } from '../../../util/theme';
import { ApprovalRequest } from '@metamask/approval-controller';

export interface ConfirmationProps {
  approvalRequest: ApprovalRequest<any>;
  onConfirm: () => void;
  onCancel?: () => void;
}

type Action = () => void;
export interface Actions {
  [key: string]: Action | undefined;
}

const Confirmation = ({
  approvalRequest,
  onConfirm,
  onCancel,
}: ConfirmationProps) => {
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
      label: templatedValues.submitText ?? strings('approval_result.ok'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
    },
  ];

  if (onCancel) {
    buttons.push({
      variant: ButtonVariants.Secondary,
      label: templatedValues.cancelText ?? strings('approval_result.cancel'),
      size: ButtonSize.Lg,
      onPress: onCancel,
    });
  }

  return (
    <View style={styles.root}>
      <MetamaskTemplateRenderer sections={templatedValues.content} />
      <View style={styles.actionContainer}>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={buttons}
        />
      </View>
    </View>
  );
};

export default Confirmation;
