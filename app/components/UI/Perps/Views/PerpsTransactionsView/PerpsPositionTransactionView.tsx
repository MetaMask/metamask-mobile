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
import { BigNumber } from 'bignumber.js';
import {
  formatPerpsFiat,
  formatPnl,
  formatTransactionDate,
} from '../../utils/formatUtils';
import { getHyperliquidExplorerUrl } from '../../utils/blockchainUtils';
import { usePerpsNetwork } from '../../hooks';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import PerpsTransactionDetailAssetHero from '../../components/PerpsTransactionDetailAssetHero';

type PerpsPositionTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsPositionTransaction'
>;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return createTransactionDetailStyles(theme);
};

const PerpsPositionTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsPositionTransactionRouteProp>();
  const perpsNetwork = usePerpsNetwork();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;
  navigation.setOptions(
    getPerpsTransactionsDetailsNavbar(
      navigation,
      transaction.fill?.shortTitle || '',
    ),
  );

  if (!transaction) {
    // Handle missing transaction data
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

  // Asset display component with metadata

  // Main detail rows - only show if values exist
  const mainDetailRows = [
    { label: 'Date', value: formatTransactionDate(transaction.timestamp) },
    transaction.fill?.amount && {
      label: 'Size',
      value: `${formatPerpsFiat(Math.abs(transaction.fill?.amountNumber))}`,
    },
    transaction.fill?.entryPrice && {
      label: 'Entry price',
      value: `${formatPerpsFiat(transaction.fill?.entryPrice)}`,
    },
  ].filter(Boolean);

  // Secondary detail rows - only show if values exist
  const secondaryDetailRows = [
    transaction.fill?.fee && {
      label: 'Total fees',
      value: `${
        BigNumber(transaction.fill?.fee).isGreaterThan(0.01)
          ? formatPerpsFiat(transaction.fill?.fee)
          : `$${transaction.fill?.fee}`
      }`,
      textColor: TextColor.Default,
    },
  ].filter(Boolean);

  if (transaction.fill?.pnl && transaction.fill?.action === 'Closed') {
    const greaterThanZero = BigNumber(transaction.fill?.pnl).isGreaterThan(0);
    const greaterThanCent = BigNumber(transaction.fill?.pnl).isGreaterThan(
      0.01,
    );
    const lessThanNegCent = BigNumber(transaction.fill?.pnl).isLessThan(-0.01);
    secondaryDetailRows.push({
      label: 'Net P&L',
      value: greaterThanZero
        ? `${
            greaterThanCent
              ? formatPnl(transaction.fill?.pnl)
              : `+$${transaction.fill?.pnl}`
          }`
        : `${
            lessThanNegCent
              ? formatPnl(transaction.fill?.pnl)
              : `-$${Math.abs(parseFloat(transaction.fill?.pnl))}`
          }`,
      textColor: BigNumber(transaction.fill?.pnl).isGreaterThanOrEqualTo(0)
        ? TextColor.Success
        : TextColor.Error,
    });
  }

  // Points or Net P&L row - only show if values exist
  if (transaction.fill?.points) {
    secondaryDetailRows.push({
      label: 'Points',
      value: transaction.fill?.points,
      textColor: TextColor.Success,
    });
  }

  return (
    <ScreenView>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <PerpsTransactionDetailAssetHero
            transaction={transaction}
            styles={styles}
          />

          {/* Transaction details */}
          <View style={styles.detailsContainer}>
            {mainDetailRows.map(
              (detail, index) =>
                detail && (
                  <View
                    key={index}
                    style={[
                      styles.detailRow,
                      index === mainDetailRows.length - 1 &&
                        styles.detailRowLast,
                    ]}
                  >
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Alternative}
                    >
                      {detail.label}
                    </Text>
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Default}
                    >
                      {detail.value}
                    </Text>
                  </View>
                ),
            )}

            {/* Separator between sections */}
            {secondaryDetailRows.length > 0 && (
              <View style={styles.sectionSeparator} />
            )}

            {/* Secondary details (fees, P&L, etc.) */}
            {secondaryDetailRows.map(
              (detail, index) =>
                detail && (
                  <View
                    key={`secondary-${index}`}
                    style={[
                      styles.detailRow,
                      index === secondaryDetailRows.length - 1 &&
                        styles.detailRowLast,
                    ]}
                  >
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text
                      variant={TextVariant.BodySM}
                      color={detail.textColor}
                      style={styles.detailValue}
                    >
                      {detail.value}
                    </Text>
                  </View>
                ),
            )}
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

export default PerpsPositionTransactionView;
