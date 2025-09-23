import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { formatEther } from 'ethers/lib/utils';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './FooterButtonGroup.styles';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import usePoolStakedDeposit from '../../../../hooks/usePoolStakedDeposit';
import Engine from '../../../../../../../core/Engine';
import {
  FooterButtonGroupActions,
  FooterButtonGroupProps,
} from './FooterButtonGroup.types';
import Routes from '../../../../../../../constants/navigation/Routes';
import usePoolStakedUnstake from '../../../../hooks/usePoolStakedUnstake';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../../hooks/useMetrics';
import { IMetaMetricsEvent } from '../../../../../../../core/Analytics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../../../constants/events';
import { EVM_SCOPE } from '../../../../../Earn/constants/networks';

const STAKING_TX_METRIC_EVENTS: Record<
  FooterButtonGroupActions,
  Record<
    'APPROVED' | 'REJECTED' | 'CONFIRMED' | 'FAILED' | 'SUBMITTED',
    IMetaMetricsEvent
  >
> = {
  STAKE: {
    APPROVED: MetaMetricsEvents.STAKE_TRANSACTION_APPROVED,
    REJECTED: MetaMetricsEvents.STAKE_TRANSACTION_REJECTED,
    CONFIRMED: MetaMetricsEvents.STAKE_TRANSACTION_CONFIRMED,
    FAILED: MetaMetricsEvents.STAKE_TRANSACTION_FAILED,
    SUBMITTED: MetaMetricsEvents.STAKE_TRANSACTION_SUBMITTED,
  },
  UNSTAKE: {
    APPROVED: MetaMetricsEvents.UNSTAKE_TRANSACTION_APPROVED,
    REJECTED: MetaMetricsEvents.UNSTAKE_TRANSACTION_REJECTED,
    CONFIRMED: MetaMetricsEvents.UNSTAKE_TRANSACTION_CONFIRMED,
    FAILED: MetaMetricsEvents.UNSTAKE_TRANSACTION_FAILED,
    SUBMITTED: MetaMetricsEvents.UNSTAKE_TRANSACTION_SUBMITTED,
  },
};

const FooterButtonGroup = ({ valueWei, action }: FooterButtonGroupProps) => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();
  const { navigate } = navigation;

  const { trackEvent, createEventBuilder } = useMetrics();

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );

  const { attemptDepositTransaction } = usePoolStakedDeposit();

  const { attemptUnstakeTransaction } = usePoolStakedUnstake();

  const [didSubmitTransaction, setDidSubmitTransaction] = useState(false);

  const isStaking = useMemo(
    () => action === FooterButtonGroupActions.STAKE,
    [action],
  );

  const submitTxMetaMetric = useCallback(
    (txEventName: IMetaMetricsEvent) => {
      const { STAKE_CONFIRMATION_VIEW, UNSTAKE_CONFIRMATION_VIEW } =
        EVENT_LOCATIONS;

      const location = isStaking
        ? STAKE_CONFIRMATION_VIEW
        : UNSTAKE_CONFIRMATION_VIEW;

      return trackEvent(
        createEventBuilder(txEventName)
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location,
            transaction_amount_eth: formatEther(valueWei),
          })
          .build(),
      );
    },
    [createEventBuilder, isStaking, trackEvent, valueWei],
  );

  const listenForTransactionEvents = useCallback(
    (transactionId?: string) => {
      if (!transactionId) return;

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionApproved',
        () => {
          submitTxMetaMetric(STAKING_TX_METRIC_EVENTS[action].APPROVED);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          submitTxMetaMetric(STAKING_TX_METRIC_EVENTS[action].SUBMITTED);
          setDidSubmitTransaction(false);
          navigate(Routes.TRANSACTIONS_VIEW);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          submitTxMetaMetric(STAKING_TX_METRIC_EVENTS[action].FAILED);
          setDidSubmitTransaction(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          submitTxMetaMetric(STAKING_TX_METRIC_EVENTS[action].REJECTED);
          setDidSubmitTransaction(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          submitTxMetaMetric(STAKING_TX_METRIC_EVENTS[action].CONFIRMED);
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    },
    [action, navigate, submitTxMetaMetric],
  );

  const handleConfirmation = async () => {
    try {
      if (!selectedAccount?.address) return;

      setDidSubmitTransaction(true);

      const metricsEvent = {
        name: isStaking
          ? MetaMetricsEvents.STAKE_TRANSACTION_INITIATED
          : MetaMetricsEvents.UNSTAKE_TRANSACTION_INITIATED,
        location: isStaking
          ? EVENT_LOCATIONS.STAKE_CONFIRMATION_VIEW
          : EVENT_LOCATIONS.UNSTAKE_CONFIRMATION_VIEW,
      };

      trackEvent(
        createEventBuilder(metricsEvent.name)
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: metricsEvent.location,
            transaction_amount_eth: formatEther(valueWei),
          })
          .build(),
      );

      let transactionId: string | undefined;

      if (isStaking) {
        if (!attemptDepositTransaction) return;
        const txRes = await attemptDepositTransaction(
          valueWei,
          selectedAccount.address,
        );
        transactionId = txRes?.transactionMeta?.id;
      }
      // Unstaking
      else {
        const txRes = await attemptUnstakeTransaction(
          valueWei,
          selectedAccount.address,
        );
        transactionId = txRes?.transactionMeta?.id;
      }

      listenForTransactionEvents(transactionId);
    } catch (e) {
      setDidSubmitTransaction(false);
    }
  };

  const handleCancelPress = () => {
    const metricsEvent = {
      name: isStaking
        ? MetaMetricsEvents.STAKE_CANCEL_CLICKED
        : MetaMetricsEvents.UNSTAKE_CANCEL_CLICKED,
      location: isStaking
        ? EVENT_LOCATIONS.STAKE_CONFIRMATION_VIEW
        : EVENT_LOCATIONS.UNSTAKE_CONFIRMATION_VIEW,
    };

    trackEvent(
      createEventBuilder(metricsEvent.name)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          location: metricsEvent.location,
        })
        .build(),
    );

    navigation.goBack();
  };

  return (
    <View style={styles.footerContainer}>
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
            {strings('stake.cancel')}
          </Text>
        }
        testID="cancel-button"
        style={styles.button}
        variant={ButtonVariants.Secondary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        onPress={handleCancelPress}
        disabled={didSubmitTransaction}
      />
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
            {strings('stake.continue')}
          </Text>
        }
        testID="continue-button"
        style={styles.button}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        onPress={handleConfirmation}
        disabled={didSubmitTransaction}
        loading={didSubmitTransaction}
      />
    </View>
  );
};

export default FooterButtonGroup;
