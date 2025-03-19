import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextStyle,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Feather';
import { Transaction } from '@metamask/keyring-api';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import { toDateFormat } from '../../../util/date';
import { formatAddress } from '../../../util/address';
import { capitalize } from 'lodash';
import StatusText from '../../Base/StatusText';
import { useTheme } from '../../../util/theme';
import { ThemeTypography } from '@metamask/design-tokens';
import { strings } from '../../../../locales/i18n';
import {
  getAddressUrl,
  getTransactionUrl,
} from '../../../core/Multichain/utils';
import { Colors } from '../../../util/theme/models';

interface TransactionDetailsProps {
  isVisible: boolean;
  onClose: () => void;
  transaction: Transaction;
  userAddress: string;
  navigation: NavigationProp<ParamListBase>;
}

const TransactionDetailRow = {
  Status: strings('transactions.status'),
  TransactionID: strings('transactions.transaction_id'),
  From: strings('transactions.from'),
  To: strings('transactions.to'),
  Amount: strings('transactions.amount'),
  NetworkFee: strings('transactions.network_fee'),
  PriorityFee: strings('transactions.multichain_priority_fee'),
} as const;

const createStyles = (colors: Colors, typography: ThemeTypography) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    header: {
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 20,
      position: 'relative',
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    date: {
      fontSize: 14,
      color: colors.text.muted,
    },
    closeButton: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
    content: {
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    label: {
      fontSize: 16,
      color: colors.text.default,
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    value: {
      fontSize: 16,
      color: colors.text.default,
      textAlign: 'right',
    },
    linkText: {
      color: colors.primary.default,
    },
    linkContainer: {
      flexDirection: 'row',
    },
    linkIcon: {
      marginLeft: 5,
    },
    viewDetailsButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
    },
    viewDetailsText: {
      color: colors.primary.default,
      fontSize: 16,
      marginRight: 5,
    },
    listItemStatus: {
      ...(typography.lBodyMDBold as TextStyle),
    },
  });

const MultichainTransactionDetailsModal: React.FC<TransactionDetailsProps> = ({
  isVisible,
  onClose,
  transaction,
  userAddress,
  navigation,
}) => {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);

  const {
    id,
    type,
    timestamp,
    chain,
    status,
    from,
    to,
    baseFee,
    priorityFee,
    asset,
  } = useMultichainTransactionDisplay({ transaction, userAddress });

  const viewOnBlockExplorer = (label: string) => {
    let url = '';
    switch (label) {
      case TransactionDetailRow.TransactionID:
        url = getTransactionUrl(id, chain);
        break;
      case TransactionDetailRow.From:
        url = getAddressUrl(from?.address || '', chain);
        break;
      case TransactionDetailRow.To:
        url = getAddressUrl(to?.address || '', chain);
        break;
      default:
        break;
    }

    try {
      onClose();
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: { url },
      });
    } catch (e) {
      console.error(e, {
        message: `failed to open block explorer for ${chain}`,
      });
    }
  };

  const renderDetailRow = (
    label: string,
    value: string,
    isLink: boolean = false,
  ) => (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        {isLink ? (
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => viewOnBlockExplorer(label)}
          >
            <Text style={[styles.value, styles.linkText]}>
              {formatAddress(value, 'short')}
            </Text>
            <Icon
              name="external-link"
              size={16}
              color="#0376C9"
              style={styles.linkIcon}
            />
          </TouchableOpacity>
        ) : label === 'Status' ? (
          <StatusText
            testID={`transaction-status-${transaction.id}`}
            status={status}
            style={styles.listItemStatus as TextStyle}
            context="transaction"
          />
        ) : (
          <Text style={[styles.value]}>{value}</Text>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.modal}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{strings(`transactions.${type}`)}</Text>
          <Text style={styles.date}>
            {timestamp && toDateFormat(new Date(timestamp * 1000))}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            testID={`transaction-details-close-button`}
          >
            <Icon name="x" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {renderDetailRow(TransactionDetailRow.Status, capitalize(status))}
          {renderDetailRow(TransactionDetailRow.TransactionID, id, true)}
          {renderDetailRow(
            TransactionDetailRow.From,
            from?.address || '',
            true,
          )}
          {renderDetailRow(TransactionDetailRow.To, to?.address || '', true)}
          {renderDetailRow(
            TransactionDetailRow.Amount,
            `${asset?.amount} ${asset?.unit}`,
          )}
          {baseFee &&
            renderDetailRow(
              TransactionDetailRow.NetworkFee,
              `${baseFee?.amount} ${baseFee?.unit}`,
            )}
          {priorityFee &&
            renderDetailRow(
              TransactionDetailRow.PriorityFee,
              `${priorityFee?.amount} ${priorityFee?.unit}`,
            )}
        </View>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() =>
            viewOnBlockExplorer(TransactionDetailRow.TransactionID)
          }
        >
          <Text style={styles.viewDetailsText}>
            {strings('networks.view_details')}
          </Text>
          <Icon name="external-link" size={16} color="#0376C9" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default MultichainTransactionDetailsModal;
