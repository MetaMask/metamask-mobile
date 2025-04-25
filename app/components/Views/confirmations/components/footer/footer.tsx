import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { ConfirmationFooterSelectorIDs } from '../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../locales/i18n';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import AppConstants from '../../../../../core/AppConstants';
import { useStyles } from '../../../../../component-library/hooks';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useAlerts } from '../../context/alert-system-context';
import ConfirmAlertModal from '../../components/modals/confirm-alert-modal';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { useConfirmationAlertMetrics } from '../../hooks/metrics/useConfirmationAlertMetrics';
import { useStandaloneConfirmation } from '../../hooks/ui/useStandaloneConfirmation';
import { useQRHardwareContext } from '../../context/qr-hardware-context/qr-hardware-context';
import { useSecurityAlertResponse } from '../../hooks/alerts/useSecurityAlertResponse';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { isStakingConfirmation } from '../../utils/confirm';
import { ResultType } from '../../constants/signatures';
import styleSheet from './footer.styles';

export const Footer = () => {
  const {
    alerts,
    fieldAlerts,
    hasBlockingAlerts,
    hasDangerAlerts,
    hasUnconfirmedDangerAlerts,
  } = useAlerts();
  const { onConfirm, onReject } = useConfirmActions();
  const { isQRSigningInProgress, needsCameraPermission } =
    useQRHardwareContext();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const confirmDisabled = needsCameraPermission;
  const transactionMetadata = useTransactionMetadataRequest();
  const { trackAlertMetrics } = useConfirmationAlertMetrics();
  const { isStandaloneConfirmation } = useStandaloneConfirmation();
  const isStakingConfirmationBool = isStakingConfirmation(
    transactionMetadata?.type as string,
  );

  const [confirmAlertModalVisible, setConfirmAlertModalVisible] =
    useState(false);

  const showConfirmAlertModal = useCallback(() => {
    setConfirmAlertModalVisible(true);
  }, []);

  const hideConfirmAlertModal = useCallback(() => {
    setConfirmAlertModalVisible(false);
  }, []);

  const onHandleReject = useCallback(async () => {
    hideConfirmAlertModal();
    await onReject();
  }, [hideConfirmAlertModal, onReject]);

  const onHandleConfirm = useCallback(async () => {
    hideConfirmAlertModal();
    await onConfirm();
  }, [hideConfirmAlertModal, onConfirm]);

  const onSignConfirm = useCallback(async () => {
    if (hasDangerAlerts) {
      showConfirmAlertModal();
      return;
    }
    await onConfirm();
  }, [hasDangerAlerts, onConfirm, showConfirmAlertModal]);

  useEffect(() => {
    trackAlertMetrics();
  }, [alerts, trackAlertMetrics]);

  const { styles } = useStyles(styleSheet, {
    confirmDisabled,
    isStakingConfirmationBool,
    isStandaloneConfirmation,
  });
  const confirmButtonLabel = () => {
    if (isQRSigningInProgress) {
      return strings('confirm.qr_get_sign');
    }
    if (hasUnconfirmedDangerAlerts) {
      return fieldAlerts.length > 1
        ? strings('alert_system.review_alerts')
        : strings('alert_system.review_alert');
    }
    if (hasBlockingAlerts) {
      return strings('alert_system.review_alerts');
    }
    return strings('confirm.confirm');
  };

  const getStartIcon = () => {
    if (hasUnconfirmedDangerAlerts) {
      return IconName.SecuritySearch;
    }
    if (hasDangerAlerts) {
      return IconName.Danger;
    }
  };

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('confirm.cancel'),
      size: ButtonSize.Lg,
      onPress: onReject,
      testID: ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      isDanger:
        securityAlertResponse?.result_type === ResultType.Malicious ||
        hasDangerAlerts,
      isDisabled: needsCameraPermission || hasBlockingAlerts,
      label: confirmButtonLabel(),
      size: ButtonSize.Lg,
      onPress: onSignConfirm,
      testID: ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
      startIconName: getStartIcon(),
    },
  ];

  return (
    <>
      {confirmAlertModalVisible && (
        <ConfirmAlertModal
          onReject={onHandleReject}
          onConfirm={onHandleConfirm}
        />
      )}
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={buttons}
        style={styles.base}
      />
      {isStakingConfirmationBool && (
        <View style={styles.bottomTextContainer}>
          <View style={styles.bottomTextContainerLine}>
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
          </View>
          <View style={styles.bottomTextContainerLine}>
            <Text variant={TextVariant.BodySM}>
              {strings('confirm.staking_footer.part2')}
              {'\n'}
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
        </View>
      )}
    </>
  );
};
