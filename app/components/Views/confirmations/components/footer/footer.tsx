import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { providerErrors } from '@metamask/rpc-errors';
import { useNavigation } from '@react-navigation/native';

import { ConfirmationFooterSelectorIDs } from '../../ConfirmationView.testIds';
import { strings } from '../../../../../../locales/i18n';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import AppConstants from '../../../../../core/AppConstants';
import ConfirmAlertModal from '../../components/modals/confirm-alert-modal';
import ScamQuestionnaire from '../../Views/scam-questionnaire';
import { AlertKeys } from '../../constants/alerts';
import { ResultType } from '../../constants/signatures';
import { useAlerts } from '../../context/alert-system-context';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useSecurityAlertResponse } from '../../hooks/alerts/useSecurityAlertResponse';
import { useConfirmationAlertMetrics } from '../../hooks/metrics/useConfirmationAlertMetrics';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { isStakingConfirmation } from '../../utils/confirm';
import styleSheet from './footer.styles';
import Routes from '../../../../../constants/navigation/Routes';
import { TransactionType } from '@metamask/transaction-controller';
import {
  MMM_ORIGIN,
  TRANSFER_TRANSACTION_TYPES,
} from '../../constants/confirmations';
import { hasTransactionType } from '../../utils/transaction';
import { PredictClaimFooter } from '../predict-confirmations/predict-claim-footer/predict-claim-footer';
import { useIsTransactionPayLoading } from '../../hooks/pay/useTransactionPayData';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useQRHardwareContext } from '../../context/qr-hardware-context';
import { useIsConfirmationFromQrAccount } from '../../../../../core/HardwareWallet/hooks/useIsConfirmationFromQrAccount';
import { useIsGaslessLoading } from '../../hooks/gas/useIsGaslessLoading';

const HIDE_FOOTER_BY_DEFAULT_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
  TransactionType.musdConversion,
];

export const Footer = () => {
  const {
    alerts,
    fieldAlerts,
    hasBlockingAlerts,
    hasDangerAlerts,
    hasUnconfirmedDangerAlerts,
    setAlertConfirmed,
  } = useAlerts();
  const { onConfirm, onReject } = useConfirmActions();
  const { needsCameraPermission } = useQRHardwareContext();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const transactionMetadata = useTransactionMetadataRequest();
  const { trackAlertMetrics } = useConfirmationAlertMetrics();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const transactionType = transactionMetadata?.type as TransactionType;
  const isStakingConfirmationBool = isStakingConfirmation(transactionType);
  const isMMSendReq =
    TRANSFER_TRANSACTION_TYPES.includes(transactionType) &&
    transactionMetadata?.origin === MMM_ORIGIN;
  const isPayLoading = useIsTransactionPayLoading();
  const { isGaslessLoading } = useIsGaslessLoading();
  const { isFooterVisible: isFooterVisibleFlag, isTransactionValueUpdating } =
    useConfirmationContext();

  const navigation = useNavigation();

  const [confirmAlertModalVisible, setConfirmAlertModalVisible] =
    useState(false);
  const [scamQuestionnaireVisible, setScamQuestionnaireVisible] =
    useState(false);
  // Once the questionnaire is completed (clean pass or bypass), later Confirm
  // taps skip both it and the danger-alert checkbox modal.
  const scamQuestionnaireCompletedRef = useRef(false);

  const shouldShowScamQuestionnaire =
    !scamQuestionnaireCompletedRef.current &&
    isMMSendReq &&
    securityAlertResponse?.result_type === ResultType.Malicious;

  const showConfirmAlertModal = useCallback(() => {
    setConfirmAlertModalVisible(true);
  }, []);

  const hideConfirmAlertModal = useCallback(() => {
    setConfirmAlertModalVisible(false);
  }, []);

  const hideScamQuestionnaire = useCallback(() => {
    setScamQuestionnaireVisible(false);
  }, []);

  // Returns the user to the confirm screen (does not submit). Acknowledging the
  // blockaid alert flips the button label to "Confirm" and skips the checkbox
  // modal on the next tap.
  const onScamComplete = useCallback(() => {
    scamQuestionnaireCompletedRef.current = true;
    setAlertConfirmed(AlertKeys.Blockaid, true);
    setScamQuestionnaireVisible(false);
  }, [setAlertConfirmed]);

  const onHandleReject = useCallback(async () => {
    hideConfirmAlertModal();
    hideScamQuestionnaire();
    await onReject();
  }, [hideConfirmAlertModal, hideScamQuestionnaire, onReject]);

  // "Stop this payment" on the scam warning rejects the tx and returns the user
  // to the wallet home rather than dropping them back on the confirm screen.
  const onScamReject = useCallback(async () => {
    hideScamQuestionnaire();
    await onReject(providerErrors.userRejectedRequest(), false, true);
  }, [hideScamQuestionnaire, onReject]);

  const onHandleConfirm = useCallback(async () => {
    hideConfirmAlertModal();
    hideScamQuestionnaire();
    try {
      await onConfirm();
    } catch {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  }, [hideConfirmAlertModal, hideScamQuestionnaire, onConfirm, navigation]);

  const onSignConfirm = useCallback(async () => {
    if (shouldShowScamQuestionnaire) {
      setScamQuestionnaireVisible(true);
      return;
    }
    // A completed questionnaire stands in for the danger-alert checkbox modal,
    // so don't surface it again after the user has been through that friction.
    if (hasDangerAlerts && !scamQuestionnaireCompletedRef.current) {
      showConfirmAlertModal();
      return;
    }
    await onConfirm();
  }, [
    shouldShowScamQuestionnaire,
    hasDangerAlerts,
    onConfirm,
    showConfirmAlertModal,
  ]);

  useEffect(() => {
    trackAlertMetrics();
  }, [alerts, trackAlertMetrics]);

  const { styles } = useStyles(styleSheet, {
    isStakingConfirmationBool,
    isFullScreenConfirmation,
  });

  const confirmButtonLabel = () => {
    if (isPayLoading) {
      return strings('confirm.confirm');
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
    if (isPayLoading) {
      return undefined;
    }

    if (hasUnconfirmedDangerAlerts) {
      return IconName.SecuritySearch;
    }
    if (hasDangerAlerts) {
      return IconName.Danger;
    }
  };

  const isConfirmDisabled =
    needsCameraPermission ||
    hasBlockingAlerts ||
    isTransactionValueUpdating ||
    isPayLoading ||
    isGaslessLoading;

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('confirm.cancel'),
      size: ButtonSize.Lg,
      onPress: () =>
        onReject(providerErrors.userRejectedRequest(), undefined, isMMSendReq),
      testID: ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      isDanger:
        !isPayLoading &&
        (securityAlertResponse?.result_type === ResultType.Malicious ||
          hasDangerAlerts),
      isDisabled: isConfirmDisabled,
      label: confirmButtonLabel(),
      size: ButtonSize.Lg,
      onPress: onSignConfirm,
      testID: ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
      startIconName: getStartIcon(),
    },
  ];

  const isFooterVisible =
    isFooterVisibleFlag ??
    (!transactionMetadata ||
      !hasTransactionType(transactionMetadata, HIDE_FOOTER_BY_DEFAULT_TYPES));

  if (!isFooterVisible) {
    return null;
  }

  if (
    transactionMetadata &&
    hasTransactionType(transactionMetadata, [TransactionType.predictClaim])
  ) {
    return <PredictClaimFooter onPress={onConfirm} onError={onReject} />;
  }

  return (
    <>
      {confirmAlertModalVisible && (
        <ConfirmAlertModal
          onReject={onHandleReject}
          onConfirm={onHandleConfirm}
        />
      )}
      {scamQuestionnaireVisible && (
        <ScamQuestionnaire
          onReject={onScamReject}
          onCleanPass={onScamComplete}
          onBypass={onScamComplete}
          onDismiss={hideScamQuestionnaire}
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

export function FooterSkeleton() {
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { styles } = useStyles(styleSheet, {
    isStakingConfirmationBool: false,
    isFullScreenConfirmation,
  });

  return (
    <View style={styles.footerSkeletonContainer}>
      <Skeleton height={48} style={styles.footerButtonSkeleton} />
      <Skeleton height={48} style={styles.footerButtonSkeleton} />
    </View>
  );
}
