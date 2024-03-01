import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ProgressBar from './ProgressBar';
import { useTheme } from '../../../util/theme';
import { SmartTransaction } from '@metamask/smart-transactions-controller/dist/types';
import {
  findBlockExplorerForRpc,
  getBlockExplorerTxUrl,
} from '../../../util/networks';
import { useSelector } from 'react-redux';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { NO_RPC_BLOCK_EXPLORER, RPC } from '../../../constants/network';
import { useNavigation } from '@react-navigation/native';
import { getSwapsFeatureFlags } from '../../../reducers/swaps';
import Logger from '../../../util/Logger';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import TransactionTypes from '../../../core/TransactionTypes';

interface Props {
  requestState: {
    smartTransaction: SmartTransaction;
    creationTime: number;
    isDapp: boolean;
  };
  pendingApprovalId: string;
  origin: string;
  onConfirm: () => void;
}

const FALLBACK_STX_ESTIMATED_DEADLINE_SEC = 45; // TODO: Use a value from backend instead.
const FALLBACK_STX_MAX_DEADLINE_SEC = 150; // TODO: Use a value from backend instead.

export const showRemainingTimeInMinAndSec = (
  remainingTimeInSec: number,
): string => {
  if (!Number.isInteger(remainingTimeInSec)) {
    return '0:00';
  }
  const minutes = Math.floor(remainingTimeInSec / 60);
  const seconds = remainingTimeInSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SmartTransactionStatus = ({
  requestState: { smartTransaction, creationTime, isDapp },
  pendingApprovalId,
  origin,
  onConfirm,
}: Props) => {
  const { status } = smartTransaction;
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const swapFeatureFlags = useSelector(getSwapsFeatureFlags);

  const navigation = useNavigation();
  const { colors } = useTheme();

  const stxEstimatedDeadlineSec =
    swapFeatureFlags.smartTransactions?.expectedDeadline ||
    FALLBACK_STX_ESTIMATED_DEADLINE_SEC;
  const stxMaxDeadlineSec =
    swapFeatureFlags.smartTransactions?.maxDeadline ||
    FALLBACK_STX_MAX_DEADLINE_SEC;

  const [isStxPastEstimatedDeadline, setIsStxPastEstimatedDeadline] =
    useState(false);
  const [timeLeftForPendingStxInSec, setTimeLeftForPendingStxInSec] = useState(
    stxEstimatedDeadlineSec,
  );

  // Setup styles
  const styles = StyleSheet.create({
    wrapper: {
      height: '82%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
    },
    textWrapper: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    header: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: 18,
    },
    desc: {
      textAlign: 'center',
      color: colors.text.alternative,
    },
    link: {
      color: colors.primary.default,
    },
    close: {
      position: 'absolute',
      top: 20,
      right: 20,
    },
  });

  const isStxPending = status === 'pending';

  // Calc time left for progress bar and timer display
  const stxDeadlineSec = isStxPastEstimatedDeadline
    ? stxMaxDeadlineSec
    : stxEstimatedDeadlineSec;

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isStxPending) {
      const calculateRemainingTime = () => {
        const secondsAfterStxSubmission = Math.round(
          (Date.now() - creationTime) / 1000,
        );
        if (secondsAfterStxSubmission > stxDeadlineSec) {
          if (isStxPastEstimatedDeadline) {
            setTimeLeftForPendingStxInSec(0);
            clearInterval(intervalId);
            return;
          }
          setIsStxPastEstimatedDeadline(true);
        }
        setTimeLeftForPendingStxInSec(
          stxDeadlineSec - secondsAfterStxSubmission,
        );
      };
      intervalId = setInterval(calculateRemainingTime, 1000);
      calculateRemainingTime();
    }

    return () => clearInterval(intervalId);
  }, [isStxPending, isStxPastEstimatedDeadline, creationTime, stxDeadlineSec]);

  // Set block explorer link and show explorer on click
  let rpcBlockExplorer;
  let txUrl: string | null;
  let txTitle: string | null;
  const txHash = smartTransaction.statusMetadata?.minedHash;

  if (providerConfig.type === RPC) {
    rpcBlockExplorer =
      findBlockExplorerForRpc(providerConfig.rpcUrl, networkConfigurations) ||
      NO_RPC_BLOCK_EXPLORER;
  }
  if (txHash) {
    ({ url: txUrl, title: txTitle } = getBlockExplorerTxUrl(
      providerConfig.type,
      txHash,
      rpcBlockExplorer,
    ));
  }

  const onViewTransaction = () => {
    if (txUrl && txTitle) {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: txUrl,
          title: txTitle,
        },
      });
      // Close SmartTransactionStatus
      onConfirm();
    }
  };

  // Set icon, header, and desc
  let icon;
  let iconColor;
  let header;
  let description;

  if (isStxPending && isStxPastEstimatedDeadline) {
    icon = IconName.Clock;
    iconColor = IconColor.Primary;
    header = strings(
      'smart_transactions.status_submitting_past_estimated_deadline_header',
    );
    description = strings(
      'smart_transactions.status_submitting_past_estimated_deadline_description',
      {
        timeLeft: showRemainingTimeInMinAndSec(timeLeftForPendingStxInSec),
      },
    );
  } else if (isStxPending) {
    icon = IconName.Clock;
    iconColor = IconColor.Primary;
    header = strings('smart_transactions.status_submitting_header');
    description = strings('smart_transactions.status_submitting_description', {
      timeLeft: showRemainingTimeInMinAndSec(timeLeftForPendingStxInSec),
    });
  } else if (status === 'success') {
    icon = IconName.CheckCircle;
    iconColor = IconColor.Success;
    header = strings('smart_transactions.status_success_header');
    description = undefined;
  } else if (status === 'cancelled') {
    icon = IconName.Danger;
    iconColor = IconColor.Error;
    header = strings('smart_transactions.status_cancelled_header');
    description = strings('smart_transactions.status_cancelled_description');
  } else {
    // Reverted or unknown statuses
    icon = IconName.Danger;
    iconColor = IconColor.Error;
    header = strings('smart_transactions.status_failed_header');
    description = strings('smart_transactions.status_failed_description');
  }

  const percentComplete =
    (1 - timeLeftForPendingStxInSec / stxDeadlineSec) * 100;

  // Primary button
  const onPrimaryButtonPress = () => {
    onConfirm();
    Engine.context.ApprovalController.endFlow({ id: pendingApprovalId });
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  };
  const primaryButtonText = strings('smart_transactions.view_activity');

  // Secondary button
  const onSecondaryButtonPress = () => {
    onConfirm();
    Engine.context.ApprovalController.endFlow({ id: pendingApprovalId });
  };
  const secondaryButtonText =
    origin === TransactionTypes.MMM
      ? strings('smart_transactions.return')
      : strings('smart_transactions.return_to_dapp', {
          dappName: origin,
        });

  return (
    <View style={styles.wrapper}>
      <Icon name={icon} color={iconColor} size={IconSize.Xl} />

      <TouchableOpacity onPress={onConfirm} style={styles.close}>
        <Icon name={IconName.Close} />
      </TouchableOpacity>

      <Text style={styles.header}>{header}</Text>
      {isStxPending && <ProgressBar percentComplete={percentComplete} />}

      <View style={styles.textWrapper}>
        {description && <Text style={styles.desc}>{description}</Text>}
        {txHash && (
          <TouchableOpacity onPress={onViewTransaction}>
            <Text style={styles.link}>
              {strings('smart_transactions.view_transaction')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View>
        <Button
          variant={ButtonVariants.Primary}
          label={primaryButtonText}
          onPress={onPrimaryButtonPress}
        >
          {primaryButtonText}
        </Button>
        <Button
          variant={ButtonVariants.Secondary}
          label={secondaryButtonText}
          onPress={onSecondaryButtonPress}
        >
          {secondaryButtonText}
        </Button>
      </View>
    </View>
  );
};

export default SmartTransactionStatus;
