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
import Routes from '../../../constants/navigation/Routes';

interface Props {
  requestState: {
    smartTransaction: SmartTransaction;
    isDapp: boolean;
    isInSwapFlow: boolean;
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
  requestState: { smartTransaction, isDapp, isInSwapFlow },
  pendingApprovalId,
  origin,
  onConfirm,
}: Props) => {
  const { status, creationTime } = smartTransaction;
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
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    content: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 20,
      flex: 1,
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
    buttonWrapper: {
      display: 'flex',
      width: '100%',
      gap: 10,
    },
    button: {
      width: '100%',
    },
  });

  const isStxPending = status === 'pending';

  // Calc time left for progress bar and timer display
  const stxDeadlineSec = isStxPastEstimatedDeadline
    ? stxMaxDeadlineSec
    : stxEstimatedDeadlineSec;

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isStxPending && creationTime) {
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

  // Set icon, header, desc, and buttons
  let icon;
  let iconColor;
  let header;
  let description;
  let primaryButtonText;
  let secondaryButtonText;
  let onPrimaryButtonPress;
  let onSecondaryButtonPress;

  const viewActivity = () => {
    onConfirm();
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
    Logger.log('STX - View Activity');
  };

  const closeStatusPage = () => {
    onConfirm();
    Logger.log('STX - Close Status Page');
  };

  const createNewSwap = () => {
    onConfirm();
    navigation.navigate(Routes.SWAPS);
  };

  const createNewSend = () => {
    onConfirm();
    navigation.navigate('SendFlowView');
  };

  const returnTextDapp = strings('smart_transactions.return_to_dapp', {
    dappName: origin,
  });
  const returnTextMM = strings('smart_transactions.try_again');

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

    if (isDapp) {
      primaryButtonText = strings('smart_transactions.view_activity');
      onPrimaryButtonPress = viewActivity;
      secondaryButtonText = returnTextDapp;
      onSecondaryButtonPress = closeStatusPage;
    } else {
      if (isInSwapFlow) {
        primaryButtonText = strings('smart_transactions.create_new', {
          txType: strings('smart_transactions.swap'),
        });
        onPrimaryButtonPress = createNewSwap;
      } else {
        primaryButtonText = strings('smart_transactions.create_new', {
          txType: strings('smart_transactions.send'),
        });
        onPrimaryButtonPress = createNewSend;
      }

      secondaryButtonText = strings('smart_transactions.view_activity');
      onSecondaryButtonPress = viewActivity;
    }
  } else if (status === 'cancelled') {
    icon = IconName.Danger;
    iconColor = IconColor.Error;
    header = strings('smart_transactions.status_cancelled_header');
    description = strings('smart_transactions.status_cancelled_description');

    if (isDapp) {
      secondaryButtonText = returnTextDapp;
      onSecondaryButtonPress = closeStatusPage;
    } else {
      primaryButtonText = returnTextMM;

      if (isInSwapFlow) {
        onPrimaryButtonPress = createNewSwap;
      } else {
        onPrimaryButtonPress = createNewSend;
      }

      secondaryButtonText = strings('smart_transactions.view_activity');
      onSecondaryButtonPress = viewActivity;
    }
  } else {
    // Reverted or unknown statuses (tx failed)
    icon = IconName.Danger;
    iconColor = IconColor.Error;
    header = strings('smart_transactions.status_failed_header');
    description = strings('smart_transactions.status_failed_description');

    if (isDapp) {
      secondaryButtonText = returnTextDapp;
      onSecondaryButtonPress = closeStatusPage;
    } else {
      primaryButtonText = returnTextMM;
      onPrimaryButtonPress = closeStatusPage;
      secondaryButtonText = strings('smart_transactions.view_activity');
      onSecondaryButtonPress = viewActivity;
    }
  }

  const percentComplete =
    (1 - timeLeftForPendingStxInSec / stxDeadlineSec) * 100;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={onConfirm} style={styles.close}>
        <Icon name={IconName.Close} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Icon name={icon} color={iconColor} size={IconSize.Xl} />

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
      </View>

      <View style={styles.buttonWrapper}>
        {onPrimaryButtonPress && (
          <Button
            variant={ButtonVariants.Primary}
            label={primaryButtonText}
            onPress={onPrimaryButtonPress}
            style={styles.button}
          >
            {primaryButtonText}
          </Button>
        )}
        {onSecondaryButtonPress && (
          <Button
            variant={ButtonVariants.Secondary}
            label={secondaryButtonText}
            onPress={onSecondaryButtonPress}
            style={styles.button}
          >
            {secondaryButtonText}
          </Button>
        )}
      </View>
    </View>
  );
};

export default SmartTransactionStatus;
