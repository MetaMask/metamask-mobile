import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { BigNumber } from 'bignumber.js';
import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import ScreenView from '../../../../Base/ScreenView';
import { getPerpsTransactionsDetailsNavbar } from '../../../Navbar';
import { usePerpsNetwork } from '../../hooks';
import { PerpsNavigationParamList } from '../../types/navigation';
import { getHyperliquidExplorerUrl } from '../../utils/blockchainUtils';
import {
  formatPerpsFiat,
  formatTransactionDate,
} from '../../utils/formatUtils';
import { PerpsTransaction } from '../PerpsTransactionsView/PerpsTransactionsView';
import { styleSheet } from './PerpsFundingTransactionView.styles';

// Interface now imported from PerpsTransactionsView

type PerpsFundingTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsFundingTransaction'
>;

const PerpsFundingTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsFundingTransactionRouteProp>();

  const perpsNetwork = usePerpsNetwork();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;

  // Check if transaction exists before proceeding
  if (!transaction) {
    return (
      <ScreenView>
        <View style={styles.content}>
          <Text>Transaction not found</Text>
        </View>
      </ScreenView>
    );
  }

  // Set navigation title
  navigation.setOptions(
    getPerpsTransactionsDetailsNavbar(navigation, transaction.title),
  );

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
      <ScrollView
        testID={PerpsTransactionSelectorsIDs.FUNDING_TRANSACTION_VIEW}
        style={styles.container}
      >
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
            testID={PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON}
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
