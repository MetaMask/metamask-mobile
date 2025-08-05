import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import type { Theme } from '../../../../../util/theme/models';
import { createTransactionDetailStyles } from '../../utils/transactionDetailStyles';
import ScreenView from '../../../../Base/ScreenView';
import { getPerpsTransactionsDetailsNavbar } from '../../../Navbar';
import PerpsTransactionDetailAssetHero from '../../components/PerpsTransactionDetailAssetHero';
import { usePerpsNetwork, usePerpsOrderFees } from '../../hooks';
import { PerpsNavigationParamList } from '../../types/navigation';
import { getHyperliquidExplorerUrl } from '../../utils/blockchainUtils';
import {
  formatPerpsFiat,
  formatTransactionDate,
} from '../../utils/formatUtils';

// Interface now imported from PerpsTransactionsView

type PerpsOrderTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsOrderTransaction'
>;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return createTransactionDetailStyles(theme);
};

const PerpsOrderTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsOrderTransactionRouteProp>();
  const perpsNetwork = usePerpsNetwork();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  // Get transaction from route params
  const transaction = route.params?.transaction;

  // Call hooks before conditional return
  const { totalFee, protocolFee, metamaskFee } = usePerpsOrderFees({
    orderType: transaction?.order?.type ?? 'market',
    amount: transaction?.order?.size ?? '0',
  });

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

  // Main detail rows based on design
  const mainDetailRows = [
    { label: 'Date', value: formatTransactionDate(transaction.timestamp) },
    // Add order-specific fields when available from transaction data
    {
      label: 'Size',
      value: formatPerpsFiat(transaction.order?.size ?? 0),
    },
    {
      label: 'Limit price',
      value: formatPerpsFiat(transaction.order?.limitPrice ?? 0),
    },
    { label: 'Filled', value: transaction.order?.filled },
  ];

  const isFilled = transaction.order?.text === 'Filled';
  // Fee breakdown

  const feeRows = [
    {
      label: 'MetaMask fee',
      value: `${
        isFilled
          ? `${
              BigNumber(metamaskFee).isLessThan(0.01)
                ? `$${metamaskFee}`
                : formatPerpsFiat(metamaskFee)
            }`
          : '$0'
      }`,
    },
    {
      label: 'Hyperliquid fee',
      value: `${
        isFilled
          ? `${
              BigNumber(protocolFee).isLessThan(0.01)
                ? `$${protocolFee}`
                : formatPerpsFiat(protocolFee)
            }`
          : '$0'
      }`,
    },
    {
      label: 'Total fee',
      value: `${
        isFilled
          ? `${
              BigNumber(totalFee).isLessThan(0.01)
                ? `$${totalFee}`
                : formatPerpsFiat(totalFee)
            }`
          : '$0'
      }`,
    },
  ];

  return (
    <ScreenView>
      <ScrollView
        testID="perps-order-transaction-view"
        style={styles.container}
      >
        <View style={styles.content}>
          <PerpsTransactionDetailAssetHero
            transaction={transaction}
            styles={styles}
          />

          {/* Transaction details */}
          <View style={styles.detailsContainer}>
            {mainDetailRows.map((detail, index) => (
              <View
                key={index}
                style={[
                  styles.detailRow,
                  index === mainDetailRows.length - 1 && styles.detailRowLast,
                ]}
              >
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

            {/* Separator between sections */}
            <View style={styles.sectionSeparator} />

            {/* Fee breakdown */}
            {feeRows.map((detail, index) => (
              <View
                key={`fee-${index}`}
                style={[
                  styles.detailRow,
                  index === feeRows.length - 1 && styles.detailRowLast,
                ]}
              >
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
            testID="block-explorer-button"
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

export default PerpsOrderTransactionView;
