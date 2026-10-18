import React, { type ReactNode } from 'react';
import {
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
  type TextStyle,
} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import type { ThemeColors } from '@metamask/design-tokens';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { strings } from '../../../../locales/i18n';
import { toDateFormat } from '../../../util/date';
import { isTestNet } from '../../../util/networks';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import StyledButton from '../StyledButton';
import {
  FINAL_NON_CONFIRMED_STATUSES,
  useBridgeTxHistoryData,
} from '../../../util/bridge/hooks/useBridgeTxHistoryData';
import BridgeActivityItemTxSegments from '../Bridge/components/TransactionDetails/BridgeActivityItemTxSegments';
import {
  getSwapBridgeTxActivityTitle,
  isBridgeTxHistoryItemBridge,
} from '../Bridge/utils/transaction-history';
import { hasGasFeeTokenSelected } from '../../Views/confirmations/utils/transaction';
import type { TransactionWithImportTime } from '../Transactions/AssetDetailsActivityListItem.utils';
import TransactionElementIcon from './TransactionElementIcon';
import type { TransactionElementStyles } from './styles';
import type {
  DecodedTransactionDetails,
  DecodedTransactionElement,
} from './types';

const INTENT_STATUS = {
  SUBMITTED: 'SUBMITTED',
  PENDING: 'PENDING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
} as const;

const TRANSACTION_STATUS = {
  SUBMITTED: TransactionStatus.submitted,
  PENDING: 'pending',
  CONFIRMED: TransactionStatus.confirmed,
  FAILED: TransactionStatus.failed,
} as const;

type DisplayTransactionStatus = TransactionStatus | 'pending';

type ViewStyles = TransactionElementStyles & {
  infoIcon?: TextStyle;
};

const mapIntentStatusToTransactionStatus = (
  intentStatus: string,
): DisplayTransactionStatus => {
  if (intentStatus === INTENT_STATUS.PENDING) {
    return TRANSACTION_STATUS.PENDING;
  }
  if (intentStatus === INTENT_STATUS.COMPLETE) {
    return TRANSACTION_STATUS.CONFIRMED;
  }
  if (intentStatus === INTENT_STATUS.FAILED) {
    return TRANSACTION_STATUS.FAILED;
  }
  if (intentStatus === INTENT_STATUS.SUBMITTED) {
    return TRANSACTION_STATUS.SUBMITTED;
  }

  // if it is unknown status, default to failed
  return TRANSACTION_STATUS.FAILED;
};

interface ActionButtonProps {
  children: ReactNode;
  onPress: () => void;
  styles: ViewStyles;
  type: 'cancel' | 'normal';
  withMargin?: boolean;
}

const ActionButton = ({
  children,
  onPress,
  styles,
  type,
  withMargin,
}: ActionButtonProps) => (
  <StyledButton
    type={type}
    containerStyle={[
      styles.actionContainerStyle,
      withMargin && styles.speedupActionContainerStyle,
    ]}
    style={styles.actionStyle}
    onPress={onPress}
  >
    {children}
  </StyledButton>
);

interface ImportTimeRowProps {
  accountImportTime: number;
  onPress: () => void;
  styles: ViewStyles;
}

const ImportTimeRow = ({
  accountImportTime,
  onPress,
  styles,
}: ImportTimeRowProps) => (
  <View style={styles.row}>
    <TouchableOpacity onPress={onPress} style={styles.importRowBody}>
      <Text style={styles.importText}>
        {`${strings('transactions.import_wallet_row')} `}
        <FAIcon name="info-circle" style={styles.infoIcon} />
      </Text>
      <ListItem.Date>{toDateFormat(accountImportTime)}</ListItem.Date>
    </TouchableOpacity>
  </View>
);

type TransactionElementTransaction = TransactionWithImportTime & {
  isSmartTransaction?: boolean;
};

interface TransactionElementViewProps {
  accountImportTime?: number;
  bridgeTxHistoryData: ReturnType<typeof useBridgeTxHistoryData>;
  colors: ThemeColors;
  i?: number;
  isLedgerAccount?: boolean;
  isQRHardwareAccount?: boolean;
  onCancel: () => void;
  onCancelUnsignedQR: () => void;
  onImportWalletTip: () => void;
  onPress: () => void;
  onSignLedger: () => void;
  onSignQR: () => void;
  onSpeedUp: () => void;
  showBottomBorder?: boolean;
  styles: ViewStyles;
  transactionElement?: DecodedTransactionElement;
  transactionDetails?: DecodedTransactionDetails;
  transactions: TransactionMeta[];
  tx: TransactionElementTransaction;
  txTime: string;
}

const TransactionElementView = ({
  accountImportTime,
  bridgeTxHistoryData,
  colors,
  i,
  isLedgerAccount,
  isQRHardwareAccount,
  onCancel,
  onCancelUnsignedQR,
  onImportWalletTip,
  onPress,
  onSignLedger,
  onSignQR,
  onSpeedUp,
  showBottomBorder,
  styles,
  transactionElement,
  transactionDetails,
  transactions,
  tx,
  txTime,
}: TransactionElementViewProps) => {
  const isReady = Boolean(transactionElement && transactionDetails);

  const renderImportTime = () => {
    if (!tx.insertImportTime || !accountImportTime) {
      return null;
    }

    return (
      <ImportTimeRow
        accountImportTime={accountImportTime}
        onPress={onImportWalletTip}
        styles={styles}
      />
    );
  };

  const renderPendingElement = () => (
    <ListItem>
      <ListItem.Date style={styles.listItemDate}>{txTime}</ListItem.Date>
      <ListItem.Content style={styles.listItemContent}>
        <ListItem.Icon>
          <View style={styles.icon} />
        </ListItem.Icon>
        <ListItem.Body>
          <ListItem.Title numberOfLines={1} style={styles.listItemTitle}>
            ...
          </ListItem.Title>
          <StatusText
            testID={`transaction-status-${i}`}
            status={tx.status}
            style={styles.listItemStatus}
          />
        </ListItem.Body>
      </ListItem.Content>
    </ListItem>
  );

  const renderReadyElement = () => {
    if (!transactionElement) {
      return renderPendingElement();
    }

    const { bridgeTxHistoryItem, is7702Batch, isBridgeComplete } =
      bridgeTxHistoryData;
    const isBridgeTransaction =
      tx.type === TransactionType.bridge ||
      Boolean(
        bridgeTxHistoryItem && isBridgeTxHistoryItemBridge(bridgeTxHistoryItem),
      );
    const { value, fiatValue = false, actionKey } = transactionElement;
    const transactionStatus =
      bridgeTxHistoryItem?.status && bridgeTxHistoryItem.quote.intent
        ? mapIntentStatusToTransactionStatus(bridgeTxHistoryItem.status.status)
        : tx.status;
    const renderNormalActions =
      (transactionStatus === 'submitted' ||
        (transactionStatus === 'approved' &&
          !isQRHardwareAccount &&
          !isLedgerAccount)) &&
      !tx.isSmartTransaction &&
      !isBridgeTransaction &&
      !hasGasFeeTokenSelected(tx);
    const renderUnsignedQRActions =
      transactionStatus === 'approved' && isQRHardwareAccount;
    const renderLedgerActions =
      transactionStatus === 'approved' && isLedgerAccount;
    const title = bridgeTxHistoryItem
      ? (getSwapBridgeTxActivityTitle(bridgeTxHistoryItem, is7702Batch) ??
        actionKey)
      : actionKey;

    return (
      <ListItem>
        <ListItem.Date style={styles.listItemDate}>{txTime}</ListItem.Date>
        <ListItem.Content style={styles.listItemContent}>
          <ListItem.Icon>
            <TransactionElementIcon
              transactionElement={transactionElement}
              tx={tx}
              transactions={transactions}
              styles={styles}
            />
          </ListItem.Icon>
          <ListItem.Body>
            <ListItem.Title numberOfLines={1} style={styles.listItemTitle}>
              {title}
            </ListItem.Title>
            {!FINAL_NON_CONFIRMED_STATUSES.some(
              (status) => status === transactionStatus,
            ) &&
            isBridgeTransaction &&
            !isBridgeComplete ? (
              <BridgeActivityItemTxSegments
                bridgeTxHistoryItem={bridgeTxHistoryItem}
                transactionStatus={transactionStatus}
              />
            ) : (
              <StatusText
                testID={`transaction-status-${i}`}
                status={transactionStatus}
                style={styles.listItemStatus}
              />
            )}
          </ListItem.Body>
          {Boolean(value) && (
            <ListItem.Amounts>
              {!isTestNet(tx.chainId) && (
                <ListItem.FiatAmount style={styles.listItemFiatAmount}>
                  {fiatValue}
                </ListItem.FiatAmount>
              )}
              <ListItem.Amount style={styles.listItemAmount}>
                {value}
              </ListItem.Amount>
            </ListItem.Amounts>
          )}
        </ListItem.Content>
        {renderNormalActions && (
          <ListItem.Actions>
            <ActionButton
              type="normal"
              styles={styles}
              onPress={onSpeedUp}
              withMargin
            >
              {strings('transaction.speedup')}
            </ActionButton>
            <ActionButton type="cancel" styles={styles} onPress={onCancel}>
              {strings('transaction.cancel')}
            </ActionButton>
          </ListItem.Actions>
        )}
        {renderUnsignedQRActions && (
          <ListItem.Actions>
            <ActionButton
              type="normal"
              styles={styles}
              onPress={onSignQR}
              withMargin
            >
              {strings('transaction.sign_with_keystone')}
            </ActionButton>
            <ActionButton
              type="cancel"
              styles={styles}
              onPress={onCancelUnsignedQR}
              withMargin
            >
              {strings('transaction.cancel')}
            </ActionButton>
          </ListItem.Actions>
        )}
        {renderLedgerActions && (
          <ListItem.Actions>
            <ActionButton
              type="normal"
              styles={styles}
              onPress={onSignLedger}
              withMargin
            >
              {strings('transaction.sign_with_ledger')}
            </ActionButton>
          </ListItem.Actions>
        )}
      </ListItem>
    );
  };

  return (
    <>
      {accountImportTime !== undefined &&
        accountImportTime > tx.time &&
        renderImportTime()}
      <TouchableHighlight
        style={showBottomBorder ? styles.rowWithBorder : styles.row}
        onPress={isReady ? onPress : undefined}
        underlayColor={colors.background.alternative}
        activeOpacity={1}
      >
        {isReady ? renderReadyElement() : renderPendingElement()}
      </TouchableHighlight>
      {accountImportTime !== undefined &&
        accountImportTime <= tx.time &&
        renderImportTime()}
    </>
  );
};

export default TransactionElementView;
