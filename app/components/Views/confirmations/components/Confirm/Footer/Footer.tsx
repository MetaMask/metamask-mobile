import { TransactionType } from '@metamask/transaction-controller';
import React from 'react';
import { Linking, View } from 'react-native';
import { ConfirmationFooterSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, { TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import AppConstants from '../../../../../../core/AppConstants';
import { useQRHardwareContext } from '../../../context/QRHardwareContext/QRHardwareContext';
import { useScrollContext } from '../../../context/ScrollContext';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useSecurityAlertResponse } from '../../../hooks/useSecurityAlertResponse';
import { useTransactionMetadataRequest } from '../../../hooks/useTransactionMetadataRequest';
import { ResultType } from '../../BlockaidBanner/BlockaidBanner.types';
import styleSheet from './Footer.styles';

const Footer = () => {
  const { onConfirm, onReject } = useConfirmActions();
  const { isQRSigningInProgress, needsCameraPermission } =
    useQRHardwareContext();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const { isScrollToBottomNeeded } = useScrollContext();
  const confirmDisabled = needsCameraPermission || isScrollToBottomNeeded;
  const transactionMetadata = useTransactionMetadataRequest();
  const isStakingConfirmation = [
    TransactionType.stakingDeposit,
    TransactionType.stakingUnstake,
    TransactionType.stakingClaim,
  ].includes(transactionMetadata?.type as TransactionType);
  const { styles } = useStyles(styleSheet, { confirmDisabled, isStakingConfirmation });

  return (
    <View>
      <View style={styles.buttonsContainer}>
        <Button
          onPress={onReject}
          label={strings('confirm.reject')}
          style={styles.rejectButton}
          size={ButtonSize.Lg}
          testID={ConfirmationFooterSelectorIDs.CANCEL_BUTTON}
          variant={ButtonVariants.Secondary}
          width={ButtonWidthTypes.Full}
        />
        <View style={styles.buttonDivider} />
        <Button
          onPress={onConfirm}
          label={
            isQRSigningInProgress
              ? strings('confirm.qr_get_sign')
              : strings('confirm.confirm')
          }
          style={styles.confirmButton}
          size={ButtonSize.Lg}
          testID={ConfirmationFooterSelectorIDs.CONFIRM_BUTTON}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
          isDanger={securityAlertResponse?.result_type === ResultType.Malicious}
          disabled={confirmDisabled}
        />
      </View>
      {isStakingConfirmation && (
        <View style={styles.textContainer}>
          <Text
            variant={TextVariant.BodySM}
          >
            {strings('confirm.staking_footer.part1')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() => Linking.openURL(AppConstants.URLS.TERMS_OF_USE)}
          >
            {strings('confirm.staking_footer.terms_of_use')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
          >
            {strings('confirm.staking_footer.part2')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() => Linking.openURL(AppConstants.URLS.STAKING_RISK_DISCLOSURE)}
          >
            {strings('confirm.staking_footer.risk_disclosure')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
          >
            {strings('confirm.staking_footer.part3')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default Footer;
