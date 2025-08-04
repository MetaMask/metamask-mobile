import React from 'react';
import { View, ScrollView, Linking } from 'react-native';
import {
  NavigationProp,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import type { Theme } from '../../../../../util/theme/models';
import { createTransactionDetailStyles } from '../../utils/transactionDetailStyles';
import ScreenView from '../../../../Base/ScreenView';
import { PerpsNavigationParamList } from '../../types/navigation';
import { PerpsTransaction } from '../PerpsTransactionsView/PerpsTransactionsView';
import { getPerpsTransactionsDetailsNavbar } from '../../../Navbar';
import { getHyperliquidExplorerUrl } from '../../utils/blockchainUtils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { usePerpsNetwork } from '../../hooks';
import {
  formatPerpsFiat,
  formatTransactionDate,
} from '../../utils/formatUtils';
import { BigNumber } from 'bignumber.js';

// Interface now imported from PerpsTransactionsView

type PerpsFundingTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsFundingTransaction'
>;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const baseStyles = createTransactionDetailStyles(theme);

  // Override content padding for funding view
  return {
    ...baseStyles,
    content: {
      ...baseStyles.content,
      paddingTop: 8, // Different padding for funding view
    },
    detailLabel: {
      ...baseStyles.detailLabel,
      fontSize: 16, // Larger font for funding view
    },
    detailValue: {
      ...baseStyles.detailValue,
      fontSize: 16, // Larger font for funding view
    },
  };
};

const PerpsFundingTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsFundingTransactionRouteProp>();
  const perpsNetwork = usePerpsNetwork();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;

  // Set navigation title
  navigation.setOptions(
    getPerpsTransactionsDetailsNavbar(navigation, transaction.title),
  );
  if (!transaction) {
    return (
      <ScreenView>
        <View style={styles.content}>
          <Text>Transaction not found</Text>
        </View>
      </ScreenView>
    );
  }

  const handleViewOnBlockExplorer = () => {
    if (!selectedInternalAccount) {
      return;
    }
    Linking.openURL(
      getHyperliquidExplorerUrl(perpsNetwork, selectedInternalAccount.address),
    );
  };

  const feeNumber = transaction.fundingAmount?.feeNumber || 0;

  // Funding detail rows based on design
  const detailRows = [
    { label: 'Date', value: formatTransactionDate(transaction.timestamp) },
    {
      label: 'Fee',
      value:
        BigNumber(feeNumber).isLessThan(0.01) &&
        BigNumber(feeNumber).isGreaterThan(-0.01)
          ? `${transaction.fundingAmount?.isPositive ? '+' : '-'}$${Math.abs(
              feeNumber,
            )}`
          : `${
              transaction.fundingAmount?.isPositive ? '+' : '-'
            }${formatPerpsFiat(Math.abs(feeNumber))}`,
    },
    { label: 'Rate', value: transaction.fundingAmount?.rate },
  ];

  return (
    <ScreenView>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Transaction details - clean list design */}
          <View style={styles.detailsContainer}>
            {detailRows.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {detail.label}
                </Text>
                <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Block explorer button */}
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="View on block explorer"
            onPress={handleViewOnBlockExplorer}
            style={styles.blockExplorerButton}
          />
        </View>
      </ScrollView>
    </ScreenView>
  );
};

export default PerpsFundingTransactionView;
