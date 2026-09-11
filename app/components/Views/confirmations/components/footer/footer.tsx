import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { providerErrors } from '@metamask/rpc-errors';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import { ConfirmationFooterSelectorIDs } from '../../ConfirmationView.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheetFooter,
  ButtonSize,
  ButtonsAlignment,
  IconName,
  Text,
  TextButton,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import AppConstants from '../../../../../core/AppConstants';
import ConfirmAlertModal from '../../components/modals/confirm-alert-modal';
import { ScamQuestionnaire } from '../../../../product-safety/scam-questionnaire/scam-questionnaire';
import { useSendScamQuestionnaire } from '../../../../product-safety/scam-questionnaire/useSendScamQuestionnaire';
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
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  MMM_ORIGIN,
  MM_PAY_TRANSACTION_TYPES,
  PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  TRANSFER_TRANSACTION_TYPES,
} from '../../constants/confirmations';
import { PredictClaimFooter } from '../predict-confirmations/predict-claim-footer/predict-claim-footer';
import {
  useIsTransactionPayLoading,
  useIsTransactionPaySubmitReady,
} from '../../hooks/pay/useTransactionPayData';
import { useIsTransactionPayAmountStale } from '../../hooks/pay/useIsTransactionPayAmountStale';
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
];

/**
 * Thin visibility gate for the confirmation footer.
 *
 * Runs ONLY the cheap hooks needed to decide whether the footer renders at all.
 * For the types in `HIDE_FOOTER_BY_DEFAULT_TYPES` (e.g. `moneyAccountDeposit`)
 * the footer renders `null`, and gating here avoids paying for the heavy hook
 * chain in `FooterInternal` (`useConfirmActions` -> `useTransactionConfirm` ->
 * `useHandleHwSend` -> gas subtree, plus alerts/pay/gasless hooks). Because
 * hooks cannot be conditional, keeping those in this wrapper would run them and
 * throw the result away on every hidden-footer render.
 */
export function Footer() {
  const transactionMetadata = useTransactionMetadataRequest();
  const { isFooterVisible: isFooterVisibleFlag } = useConfirmationContext();

  const isFooterVisible =
    isFooterVisibleFlag ??
    (!transactionMetadata ||
      !hasTransactionType(transactionMetadata, HIDE_FOOTER_BY_DEFAULT_TYPES));

  if (!isFooterVisible) {
    return null;
  }

  return <FooterInternal />;
}

function FooterInternal() {
  const {
    alerts,
    fieldAlerts,
    hasBlockingAlerts,
    hasDangerAlerts,
    hasUnconfirmedDangerAlerts,
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
  const isPaySubmitReady = useIsTransactionPaySubmitReady();
  const isMMPayTransaction = hasTransactionType(
    transactionMetadata,
    MM_PAY_TRANSACTION_TYPES,
  );
  const isPayTokenRequiredTransaction = hasTransactionType(
    transactionMetadata,
    PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  );
  const isPayAmountStale = useIsTransactionPayAmountStale();
  const { isGaslessLoading } = useIsGaslessLoading();
  const { isTransactionValueUpdating } = useConfirmationContext();

  const navigation = useNavigation<AppNavigationProp>();

  const [confirmAlertModalVisible, setConfirmAlertModalVisible] =
    useState(false);

  const {
    isScamQuestionnaireRequired,
    isScamQuestionnaireCompleted,
    isScamQuestionnaireVisible,
    showScamQuestionnaire,
    scamQuestionnaireProps,
  } = useSendScamQuestionnaire({ onReject });

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
    try {
      await onConfirm();
    } catch {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  }, [hideConfirmAlertModal, onConfirm, navigation]);

  const onSignConfirm = useCallback(async () => {
    if (isScamQuestionnaireRequired) {
      showScamQuestionnaire();
      return;
    }
    // A completed questionnaire stands in for the danger-alert checkbox modal,
    // so don't surface it again after the user has been through that friction.
    if (hasDangerAlerts && !isScamQuestionnaireCompleted) {
      showConfirmAlertModal();
      return;
    }
    await onConfirm();
  }, [
    isScamQuestionnaireRequired,
    isScamQuestionnaireCompleted,
    showScamQuestionnaire,
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
    (isMMPayTransaction && isPayAmountStale) ||
    // Mirror the publish guard: pay-token-required transactions (predict and
    // perps deposits) throw "MetaMask Pay: Cannot submit without quote" at
    // publish when no executable quote or validated direct/fiat route exists.
    // Block confirm in exactly those states instead of letting the tap fail.
    (isPayTokenRequiredTransaction && !isPaySubmitReady) ||
    isGaslessLoading;

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
      {isScamQuestionnaireVisible && (
        <ScamQuestionnaire {...scamQuestionnaireProps} />
      )}
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        secondaryButtonProps={{
          children: strings('confirm.cancel'),
          size: ButtonSize.Lg,
          onPress: () =>
            onReject(
              providerErrors.userRejectedRequest(),
              undefined,
              isMMSendReq,
            ),
          testID: ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
        }}
        primaryButtonProps={{
          children: confirmButtonLabel(),
          size: ButtonSize.Lg,
          onPress: onSignConfirm,
          isDisabled: isConfirmDisabled,
          isDanger:
            !isPayLoading &&
            (securityAlertResponse?.result_type === ResultType.Malicious ||
              hasDangerAlerts),
          startIconName: getStartIcon(),
          testID: ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
        }}
        style={styles.base}
      />
      {isStakingConfirmationBool && (
        <View style={styles.bottomTextContainer}>
          <View style={styles.bottomTextContainerLine}>
            <Text variant={TextVariant.BodySm}>
              {strings('confirm.staking_footer.part1')}
            </Text>
            <TextButton
              testID={ConfirmationFooterSelectorIDs.STAKING_TERMS_OF_USE_BUTTON}
              variant={TextVariant.BodySm}
              onPress={() => Linking.openURL(AppConstants.URLS.TERMS_OF_USE)}
            >
              {strings('confirm.staking_footer.terms_of_use')}
            </TextButton>
          </View>
          <View style={styles.bottomTextContainerLine}>
            <Text variant={TextVariant.BodySm}>
              {strings('confirm.staking_footer.part2')}
              {'\n'}
            </Text>
            <TextButton
              testID={
                ConfirmationFooterSelectorIDs.STAKING_RISK_DISCLOSURE_BUTTON
              }
              variant={TextVariant.BodySm}
              onPress={() =>
                Linking.openURL(AppConstants.URLS.STAKING_RISK_DISCLOSURE)
              }
            >
              {strings('confirm.staking_footer.risk_disclosure')}
            </TextButton>
            <Text variant={TextVariant.BodySm}>
              {strings('confirm.staking_footer.part3')}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

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
