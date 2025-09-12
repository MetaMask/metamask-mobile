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
import { selectIsTransactionBridgeQuotesLoadingById } from '../../../../../core/redux/slices/confirmationMetrics';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';

export const Footer = () => {
  const {
    alerts,
    fieldAlerts,
    hasBlockingAlerts,
    hasDangerAlerts,
    hasUnconfirmedDangerAlerts,
  } = useAlerts();

  const { isQRSigningInProgress, needsCameraPermission } =
    useQRHardwareContext();

  const { onConfirm, onReject } = useConfirmActions();
  const { securityAlertResponse } = useSecurityAlertResponse();
  const confirmDisabled = needsCameraPermission;
  const transactionMetadata = useTransactionMetadataRequest();
  const { trackAlertMetrics } = useConfirmationAlertMetrics();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();

  const isStakingConfirmationBool = isStakingConfirmation(
    transactionMetadata?.type as string,
  );

  const { isFooterVisible, isTransactionValueUpdating } =
    useConfirmationContext();

  const navigation = useNavigation();

  const [confirmAlertModalVisible, setConfirmAlertModalVisible] =
    useState(false);

  const isQuotesLoading = useSelector((state: RootState) =>
    selectIsTransactionBridgeQuotesLoadingById(
      state,
      transactionMetadata?.id ?? '',
    ),
  );

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
    } catch (error) {
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

  const isConfirmDisabled =
    needsCameraPermission ||
    hasBlockingAlerts ||
    isTransactionValueUpdating ||
    isQuotesLoading;

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('confirm.cancel'),
      size: ButtonSize.Lg,
      onPress: () => onReject(providerErrors.userRejectedRequest()),
      testID: ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      isDanger:
        securityAlertResponse?.result_type === ResultType.Malicious ||
        hasDangerAlerts,
      isDisabled: isConfirmDisabled,
      label: confirmButtonLabel(),
      size: ButtonSize.Lg,
      onPress: onSignConfirm,
      testID: ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
      startIconName: getStartIcon(),
    },
  ];

  if (!isFooterVisible) {
    return null;
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
