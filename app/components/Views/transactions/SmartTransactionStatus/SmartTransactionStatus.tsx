import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import ProgressBar from './ProgressBar';
import { useTheme } from '../../../../util/theme';
import {
  SmartTransaction,
  SmartTransactionStatuses,
} from '@metamask/smart-transactions-controller';
import { useSelector } from 'react-redux';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../constants/navigation/Routes';
import TransactionBackgroundTop from '../../../../images/transaction-background-top.svg';
import TransactionBackgroundBottom from '../../../../images/transaction-background-bottom.svg';
import LoopingScrollAnimation from './LoopingScrollAnimation';
import { hexToDecimal } from '../../../../util/conversions';
import useRemainingTime from './useRemainingTime';
import { ThemeColors } from '@metamask/design-tokens';
import { selectSmartTransactionsForCurrentChain } from '../../../../selectors/smartTransactionsController';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';

const getPortfolioStxLink = (chainId: Hex, uuid: string) => {
  const chainIdDec = hexToDecimal(chainId);
  return `https://portfolio.metamask.io/networks/${chainIdDec}/smart-transactions/${uuid}?referrer=mobile`;
};

interface Props {
  requestState: {
    smartTransaction: SmartTransaction;
    isDapp: boolean;
    isInSwapFlow: boolean;
  };
  origin: string;
  onConfirm: () => void;
}

export const FALLBACK_STX_ESTIMATED_DEADLINE_SEC = 45;
export const FALLBACK_STX_MAX_DEADLINE_SEC = 150;

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

interface getDisplayValuesArgs {
  status: string | undefined;
  isStxPending: boolean;
  isStxPastEstimatedDeadline: boolean;
  timeLeftForPendingStxInSec: number;
  isDapp: boolean;
  isInSwapFlow: boolean;
  origin: string;
  viewActivity: () => void;
  closeStatusPage: () => void;
  createNewSwap: () => void;
  createNewSend: () => void;
}

const getDisplayValuesAndHandlers = ({
  status,
  isStxPending,
  isStxPastEstimatedDeadline,
  timeLeftForPendingStxInSec,
  isDapp,
  isInSwapFlow,
  origin,
  viewActivity,
  closeStatusPage,
  createNewSwap,
  createNewSend,
}: getDisplayValuesArgs) => {
  const returnTextDapp = strings('smart_transactions.return_to_dapp', {
    dappName: origin,
  });
  const returnTextMM = strings('smart_transactions.try_again');

  // Set icon, header, desc, and buttons
  let icon;
  let iconColor;
  let header;
  let description;
  let primaryButtonText;
  let secondaryButtonText;
  let handlePrimaryButtonPress;
  let handleSecondaryButtonPress;

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
  } else if (status === SmartTransactionStatuses.SUCCESS) {
    icon = IconName.Confirmation;
    iconColor = IconColor.Success;
    header = strings('smart_transactions.status_success_header');
    description = undefined;

    if (isDapp) {
      primaryButtonText = strings('smart_transactions.view_activity');
      handlePrimaryButtonPress = viewActivity;
      secondaryButtonText = returnTextDapp;
      handleSecondaryButtonPress = closeStatusPage;
    } else {
      if (isInSwapFlow) {
        primaryButtonText = strings('smart_transactions.create_new', {
          txType: strings('smart_transactions.swap'),
        });
        handlePrimaryButtonPress = createNewSwap;
      } else {
        primaryButtonText = strings('smart_transactions.create_new', {
          txType: strings('smart_transactions.send'),
        });
        handlePrimaryButtonPress = createNewSend;
      }

      secondaryButtonText = strings('smart_transactions.view_activity');
      handleSecondaryButtonPress = viewActivity;
    }
  } else if (status?.startsWith(SmartTransactionStatuses.CANCELLED)) {
    icon = IconName.Danger;
    iconColor = IconColor.Error;
    header = strings('smart_transactions.status_cancelled_header');
    description = strings('smart_transactions.status_cancelled_description');

    if (isDapp) {
      secondaryButtonText = returnTextDapp;
      handleSecondaryButtonPress = closeStatusPage;
    } else {
      primaryButtonText = returnTextMM;

      if (isInSwapFlow) {
        handlePrimaryButtonPress = createNewSwap;
      } else {
        handlePrimaryButtonPress = createNewSend;
      }

      secondaryButtonText = strings('smart_transactions.view_activity');
      handleSecondaryButtonPress = viewActivity;
    }
  } else {
    // Reverted or unknown statuses (tx failed)
    icon = IconName.Danger;
    iconColor = IconColor.Error;
    header = strings('smart_transactions.status_failed_header');
    description = strings('smart_transactions.status_failed_description');

    if (isDapp) {
      secondaryButtonText = returnTextDapp;
      handleSecondaryButtonPress = closeStatusPage;
    } else {
      primaryButtonText = returnTextMM;
      handlePrimaryButtonPress = closeStatusPage;
      secondaryButtonText = strings('smart_transactions.view_activity');
      handleSecondaryButtonPress = viewActivity;
    }
  }

  return {
    icon,
    iconColor,
    header,
    description,
    primaryButtonText,
    secondaryButtonText,
    handlePrimaryButtonPress,
    handleSecondaryButtonPress,
  };
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      color: colors.text.default,
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
      zIndex: 100,
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

const SmartTransactionStatus = ({
  requestState: { smartTransaction, isDapp, isInSwapFlow },
  origin,
  onConfirm,
}: Props) => {
  const smartTransactions = useSelector(selectSmartTransactionsForCurrentChain);
  const latestSmartTransaction =
    smartTransactions[smartTransactions.length - 1];

  // For swaps, read transaction data directly from SmartTransactionsController
  // since swap flow doesn't use the standard STX approval flow
  const { status, creationTime, uuid } = isInSwapFlow
    ? latestSmartTransaction
    : smartTransaction;

  const isStxPending = status === SmartTransactionStatuses.PENDING;

  // Stable creationTime fallback for swaps (latestSmartTransaction may lack creationTime)
  const effectiveCreationTime = useMemo(() => {
    if (creationTime) return creationTime;

    return isStxPending ? Date.now() : undefined;
  }, [creationTime, isStxPending]);

  const chainId = useSelector(selectEvmChainId);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const {
    timeLeftForPendingStxInSec,
    stxDeadlineSec,
    isStxPastEstimatedDeadline,
  } = useRemainingTime({
    creationTime: effectiveCreationTime,
    isStxPending,
  });

  const viewActivity = () => {
    onConfirm();
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  };

  const closeStatusPage = () => {
    onConfirm();
  };

  const createNewSwap = () => {
    onConfirm();
    navigation.navigate(Routes.BRIDGE.ROOT);
  };

  const createNewSend = () => {
    onConfirm();
    navigation.navigate('SendFlowView');
  };

  const {
    icon,
    iconColor,
    header,
    description,
    primaryButtonText,
    secondaryButtonText,
    handlePrimaryButtonPress,
    handleSecondaryButtonPress,
  } = getDisplayValuesAndHandlers({
    status,
    isStxPending,
    isStxPastEstimatedDeadline,
    timeLeftForPendingStxInSec,
    isDapp,
    isInSwapFlow,
    origin,
    viewActivity,
    closeStatusPage,
    createNewSwap,
    createNewSend,
  });

  // Set block explorer link and show explorer on click
  // TODO: [SOLANA] Smart transactions will support solana? Flagging this revisit this before shipping.
  const txUrl = getPortfolioStxLink(chainId, uuid);

  const onViewTransaction = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: txUrl,
      },
    });
    // Close SmartTransactionStatus
    onConfirm();
  };

  const percentComplete =
    (1 - timeLeftForPendingStxInSec / stxDeadlineSec) * 100;

  const renderPrimaryButton = () =>
    handlePrimaryButtonPress ? (
      <Button
        variant={ButtonVariants.Primary}
        label={primaryButtonText}
        onPress={handlePrimaryButtonPress}
        style={styles.button}
      >
        {primaryButtonText}
      </Button>
    ) : null;

  const renderSecondaryButton = () =>
    handleSecondaryButtonPress ? (
      <Button
        variant={ButtonVariants.Secondary}
        label={secondaryButtonText}
        onPress={handleSecondaryButtonPress}
        style={styles.button}
      >
        {secondaryButtonText}
      </Button>
    ) : null;

  const renderViewTransactionLink = () => (
    <TouchableOpacity onPress={onViewTransaction}>
      <Text style={styles.link}>
        {strings('smart_transactions.view_transaction')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={onConfirm} style={styles.close}>
        <Icon name={IconName.Close} />
      </TouchableOpacity>

      <LoopingScrollAnimation width={817}>
        <TransactionBackgroundTop name="TransactionBackgroundTop" />
      </LoopingScrollAnimation>

      <View style={styles.content}>
        <Icon name={icon} color={iconColor} size={IconSize.Xl} />
        <Text style={styles.header}>{header}</Text>
        {isStxPending && <ProgressBar percentComplete={percentComplete} />}
        <View style={styles.textWrapper}>
          {description && <Text style={styles.desc}>{description}</Text>}

          {isEvmSelected ? renderViewTransactionLink() : null}
        </View>
      </View>
      <LoopingScrollAnimation width={800}>
        <TransactionBackgroundBottom name="TransactionBackgroundBottom" />
      </LoopingScrollAnimation>

      <View style={styles.buttonWrapper}>
        {renderPrimaryButton()}
        {renderSecondaryButton()}
      </View>
    </View>
  );
};

export default SmartTransactionStatus;
