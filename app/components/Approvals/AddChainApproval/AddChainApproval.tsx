import React from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import NetworkVerificationInfo from '../../UI/NetworkVerificationInfo';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';

const AddChainApproval = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  if (approvalRequest?.type !== ApprovalTypes.ADD_ETHEREUM_CHAIN) return null;

  return (
    <BottomSheet onClose={onReject} shouldNavigateBack={false} isFlexible>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {strings('add_custom_network.title')}
        </Text>
      </BottomSheetHeader>
      <NetworkVerificationInfo
        customNetworkInformation={approvalRequest?.requestData}
      />
      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: onReject,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CANCEL_BUTTON,
          },
          {
            onPress: onConfirm,
            label: strings('confirmation_modal.confirm_cta'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CONNECT_BUTTON,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
      />
    </BottomSheet>
  );
};

export default AddChainApproval;
