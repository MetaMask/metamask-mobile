import React from 'react';
import { View } from 'react-native';
import stylesheet from './ApprovalResult.styles';
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

export enum ApprovalResultType {
  Success = 'success',
  Failure = 'failure',
}

export interface ApprovalResultData {
  message?: string;
  error?: string;
  header?: unknown;
}

export interface ApprovalResultProps {
  requestData: ApprovalResultData;
  onConfirm: () => void;
  requestType: ApprovalResultType;
}
const isApprovalResultTypeSuccess = (type: string) =>
  ApprovalResultType.Success === type;

const processMessage = (
  requestData: ApprovalResultData,
  requestType: ApprovalResultType,
) => {
  if (isApprovalResultTypeSuccess(requestType)) {
    return (
      requestData?.message ??
      strings('approval_result.resultPageSuccessDefaultMessage')
    );
  }
  return (
    requestData?.error ??
    strings('approval_result.resultPageErrorDefaultMessage')
  );
};

const ApprovalResult = ({
  requestData,
  onConfirm,
  requestType,
}: ApprovalResultProps) => {
  const { styles } = useStyles(stylesheet, {});

  const okButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('approval_result.ok'),
    size: ButtonSize.Lg,
    onPress: onConfirm,
  };

  return (
    <View style={styles.root}>
      <View style={styles.accountCardWrapper}>
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <Icon
              name={
                isApprovalResultTypeSuccess(requestType)
                  ? IconName.Confirmation
                  : IconName.Warning
              }
              color={
                isApprovalResultTypeSuccess(requestType)
                  ? IconColor.Success
                  : IconColor.Error
              }
              size={IconSize.Lg}
            />
          </View>
        </View>
        <SheetHeader
          title={
            isApprovalResultTypeSuccess(requestType)
              ? strings('approval_result.success')
              : strings('approval_result.error')
          }
        />
        <Text style={styles.description} variant={TextVariant.BodyMD}>
          {processMessage(requestData, requestType)}
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

export default ApprovalResult;
