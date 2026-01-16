import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../types/navigation';
import React from 'react';
import { View, TouchableOpacity, TextStyle } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Feather';
import { Transaction } from '@metamask/keyring-api';
import { MultichainTransactionDisplayData } from '../../hooks/useMultichainTransactionDisplay';
import { toDateFormat } from '../../../util/date';
import { formatAddress } from '../../../util/address';
import { capitalize } from 'lodash';
import StatusText from '../../Base/StatusText';
import Text from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import {
  getAddressUrl,
  getTransactionUrl,
} from '../../../core/Multichain/utils';
import styles from './MultichainTransactionDetailsModal.styles';

interface TransactionDetailsProps {
  isVisible: boolean;
  onClose: () => void;
  displayData: MultichainTransactionDisplayData;
  transaction: Transaction;
  navigation: NavigationProp<RootParamList>;
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

const MultichainTransactionDetailsModal: React.FC<TransactionDetailsProps> = ({
  isVisible,
  onClose,
  displayData,
  transaction,
  navigation,
}) => {
  const { colors, typography } = useTheme();
  const style = styles(colors, typography);
  const [pendingNavigation, setPendingNavigation] = React.useState<
    string | null
  >(null);

  const { title, from, to, baseFee, priorityFee } = displayData;
  const { id, timestamp, chain, status } = transaction;

  const handleModalHide = () => {
    if (pendingNavigation) {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: { url: pendingNavigation },
      });
      setPendingNavigation(null);
    }
  };

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
      setPendingNavigation(url);
      onClose();
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
    <View style={style.detailRow}>
      <Text style={style.label}>{label}</Text>
      <View style={style.valueContainer}>
        {isLink ? (
          <TouchableOpacity
            style={style.linkContainer}
            onPress={() => viewOnBlockExplorer(label)}
          >
            <Text style={style.linkText}>{formatAddress(value, 'short')}</Text>
            <Icon
              name="external-link"
              size={16}
              color={colors.primary.default}
              style={style.linkIcon}
            />
          </TouchableOpacity>
        ) : label === 'Status' ? (
          <StatusText
            testID={`transaction-status-${transaction.id}`}
            status={status}
            style={style.listItemStatus as TextStyle}
            context="transaction"
          />
        ) : (
          <Text style={[style.value]}>{value}</Text>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onModalHide={handleModalHide}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={style.modal}
    >
      <View style={style.container}>
        <View style={style.header}>
          <Text style={style.title}>{title}</Text>
          <Text style={style.date}>
            {timestamp && toDateFormat(new Date(timestamp * 1000))}
          </Text>
          <TouchableOpacity
            style={style.closeButton}
            onPress={onClose}
            testID={`transaction-details-close-button`}
          >
            <Icon name="x" size={24} color={colors.text.default} />
          </TouchableOpacity>
        </View>

        <View style={style.content}>
          {renderDetailRow(TransactionDetailRow.Status, capitalize(status))}
          {renderDetailRow(TransactionDetailRow.TransactionID, id, true)}
          {from?.address &&
            renderDetailRow(TransactionDetailRow.From, from?.address, true)}
          {to?.address &&
            renderDetailRow(TransactionDetailRow.To, to?.address, true)}
          {to &&
            renderDetailRow(
              TransactionDetailRow.Amount,
              `${to.amount} ${to.unit}`,
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
          style={style.viewDetailsButton}
          onPress={() =>
            viewOnBlockExplorer(TransactionDetailRow.TransactionID)
          }
        >
          <Text style={style.viewDetailsText}>
            {strings('networks.view_details')}
          </Text>
          <Icon name="external-link" size={16} color={colors.primary.default} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default MultichainTransactionDetailsModal;
