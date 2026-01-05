import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { providerErrors } from '@metamask/rpc-errors';
import { useNavigation } from '@react-navigation/native';

import { ConfirmationFooterSelectorIDs } from '../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
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
import { ResultType } from '../../constants/signatures';
import { useAlerts } from '../../context/alert-system-context';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useQRHardwareContext } from '../../context/qr-hardware-context/qr-hardware-context';
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
  REDESIGNED_TRANSFER_TYPES,
} from '../../constants/confirmations';
import { hasTransactionType } from '../../utils/transaction';
import { PredictClaimFooter } from '../predict-confirmations/predict-claim-footer/predict-claim-footer';
import { useIsTransactionPayLoading } from '../../hooks/pay/useTransactionPayData';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

const HIDE_FOOTER_BY_DEFAULT_TYPES = [
  TransactionType.perpsDeposit,
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
  } = useAlerts();
  const { onConfirm, onReject } = useConfirmActions();
  const { isSigningQRObject, needsCameraPermission } = useQRHardwareContext();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const confirmDisabled = needsCameraPermission;
  const transactionMetadata = useTransactionMetadataRequest();
  const { trackAlertMetrics } = useConfirmationAlertMetrics();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const transactionType = transactionMetadata?.type as TransactionType;
  const isStakingConfirmationBool = isStakingConfirmation(transactionType);
  const isMMSendReq =
    REDESIGNED_TRANSFER_TYPES.includes(transactionType) &&
    transactionMetadata?.origin === MMM_ORIGIN;
  const isPayLoading = useIsTransactionPayLoading();

  const { isFooterVisible: isFooterVisibleFlag, isTransactionValueUpdating } =
    useConfirmationContext();

  const navigation = useNavigation();

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
    try {
      await onConfirm();
    } catch {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  }, [hideConfirmAlertModal, onConfirm, navigation]);

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
    isFullScreenConfirmation,
  });

  const confirmButtonLabel = () => {
    if (isSigningQRObject) {
      return strings('confirm.qr_get_sign');
    }

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
    isPayLoading;

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
    return <PredictClaimFooter onPress={onConfirm} />;
  }

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

export function FooterSkeleton() {
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { styles } = useStyles(styleSheet, {
    confirmDisabled: false,
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
