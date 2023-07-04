import React from 'react';
import { View } from 'react-native';
import stylesheet from './ApprovalFlowResult.styles';
import { strings } from '../../../../../locales/i18n';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../../component-library/components/Buttons/Button/Button.types';
import { useStyles } from '../../../hooks/useStyles';
import { APPROVAL_TYPE_RESULT_SUCCESS } from '@metamask/approval-controller';
import { APPROVAL_FLOW_RESULT_ID } from '../../../../constants/test-ids';

interface ApprovalFlowResultProps {
  requestData: any;
  onConfirm: () => void;
  requestType: string;
}

const ApprovalFlowResult = ({
  requestData,
  onConfirm,
  requestType,
}: ApprovalFlowResultProps) => {
  const { styles } = useStyles(stylesheet, {});

  const isApprovalTypeResultSuccess = (type: string) =>
    APPROVAL_TYPE_RESULT_SUCCESS === type;

  const okButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('approval_flow.ok'),
    size: ButtonSize.Lg,
    onPress: onConfirm,
  };

  return (
    <View testID={APPROVAL_FLOW_RESULT_ID} style={styles.root}>
      <View style={styles.accountCardWrapper}>
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <Icon
              name={
                isApprovalTypeResultSuccess(requestType)
                  ? IconName.Confirmation
                  : IconName.Warning
              }
              color={
                isApprovalTypeResultSuccess(requestType)
                  ? IconColor.Success
                  : IconColor.Error
              }
              size={IconSize.Lg}
            />
          </View>
        </View>
        <SheetHeader
          title={
            isApprovalTypeResultSuccess(requestType)
              ? strings('approval_flow.success')
              : strings('approval_flow.error')
          }
        />
        <Text style={styles.description} variant={TextVariant.BodyMD}>
          {isApprovalTypeResultSuccess(requestType)
            ? requestData?.data?.message
            : requestData?.data?.error}
        </Text>
        <View style={styles.actionContainer}>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Horizontal}
            buttonPropsArray={[okButtonProps]}
          />
        </View>
      </View>
    </View>
  );
};

export default ApprovalFlowResult;
