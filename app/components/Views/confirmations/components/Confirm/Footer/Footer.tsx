import React, { useMemo } from 'react';
import { Linking, View } from 'react-native';
import { ConfirmationFooterSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../locales/i18n';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import AppConstants from '../../../../../../core/AppConstants';
import { useLedgerContext } from '../../../context/LedgerContext';
import { useQRHardwareContext } from '../../../context/QRHardwareContext/QRHardwareContext';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useSecurityAlertResponse } from '../../../hooks/useSecurityAlertResponse';
import { useTransactionMetadataRequest } from '../../../hooks/useTransactionMetadataRequest';
import { isStakingConfirmation } from '../../../utils/confirm';
import { ResultType } from '../../BlockaidBanner/BlockaidBanner.types';
import styleSheet from './Footer.styles';

export const Footer = () => {
  const { onConfirm, onReject } = useConfirmActions();
  const { isQRSigningInProgress, needsCameraPermission } =
    useQRHardwareContext();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const { isLedgerAccount } = useLedgerContext();
  const confirmDisabled = needsCameraPermission;
  const transactionMetadata = useTransactionMetadataRequest();
  const isStakingConfirmationBool = isStakingConfirmation(
    transactionMetadata?.type as string,
  );
  const { styles } = useStyles(styleSheet, {
    confirmDisabled,
    isStakingConfirmationBool,
  });

  const confirmButtonLabel = useMemo(() => {
    if (isQRSigningInProgress) {
      return strings('confirm.qr_get_sign');
    }
    if (isLedgerAccount) {
      return strings('confirm.sign_with_ledger');
    }
    return strings('confirm.confirm');
  }, [isLedgerAccount, isQRSigningInProgress]);

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('confirm.reject'),
      size: ButtonSize.Lg,
      onPress: onReject,
      testID: ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      isDanger: securityAlertResponse?.result_type === ResultType.Malicious,
      isDisabled: needsCameraPermission,
      label: confirmButtonLabel,
      size: ButtonSize.Lg,
      onPress: onConfirm,
      testID: ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    },
  ];

  return (
    <>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={buttons}
        style={styles.base}
      />
      {isStakingConfirmationBool && (
        <View style={styles.textContainer}>
          <Text variant={TextVariant.BodySM}>
            {strings('confirm.staking_footer.part1')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() => Linking.openURL(AppConstants.URLS.TERMS_OF_USE)}
          >
            {strings('confirm.staking_footer.terms_of_use')}
          </Text>
          <Text variant={TextVariant.BodySM}>
            {strings('confirm.staking_footer.part2')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() =>
              Linking.openURL(AppConstants.URLS.STAKING_RISK_DISCLOSURE)
            }
          >
            {strings('confirm.staking_footer.risk_disclosure')}
          </Text>
          <Text variant={TextVariant.BodySM}>
            {strings('confirm.staking_footer.part3')}
          </Text>
        </View>
      )}
    </>
  );
};
