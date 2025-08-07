import {
  NavigationProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
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
import ScreenView from '../../../../Base/ScreenView';
import { getPerpsTransactionsDetailsNavbar } from '../../../Navbar';
import PerpsTransactionDetailAssetHero from '../../components/PerpsTransactionDetailAssetHero';
import { usePerpsBlockExplorerUrl } from '../../hooks';
import { PerpsNavigationParamList } from '../../types/navigation';
import {
  PerpsPositionTransactionRouteProp,
  PerpsTransaction,
} from '../../types/transactionHistory';
import {
  formatPerpsFiat,
  formatPnl,
  formatTransactionDate,
} from '../../utils/formatUtils';
import { styleSheet } from './PerpsPositionTransactionView.styles';

const PerpsPositionTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsPositionTransactionRouteProp>();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const { getExplorerUrl } = usePerpsBlockExplorerUrl();

  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;
  navigation.setOptions(
    getPerpsTransactionsDetailsNavbar(
      navigation,
      transaction?.fill?.shortTitle || '',
    ),
  );

  if (!transaction) {
    // Handle missing transaction data
    return (
      <ScreenView>
        <View style={styles.content}>
          <Text>{strings('perps.transactions.not_found')}</Text>
        </View>
      </ScreenView>
    );
  }

  const handleViewOnBlockExplorer = () => {
    if (!selectedInternalAccount) {
      return;
    }
    const explorerUrl = getExplorerUrl(selectedInternalAccount.address);
    if (!explorerUrl) {
      return;
    }
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: explorerUrl,
      },
    });
  };

  // Main detail rows - only show if values exist
  const mainDetailRows = [
    {
      label: strings('perps.transactions.position.date'),
      value: formatTransactionDate(transaction.timestamp),
    },
    transaction.fill?.amount && {
      label: strings('perps.transactions.position.size'),
      value: `${formatPerpsFiat(Math.abs(transaction.fill?.amountNumber))}`,
    },
    transaction.fill?.entryPrice && {
      label: strings('perps.transactions.position.entry_price'),
      value: `${formatPerpsFiat(transaction.fill?.entryPrice)}`,
    },
  ].filter(Boolean);

  // Secondary detail rows - only show if values exist
  const secondaryDetailRows = [
    transaction.fill?.fee && {
      label: strings('perps.transactions.position.fees'),
      value: `${
        BigNumber(transaction.fill?.fee).isGreaterThan(0.01)
          ? formatPerpsFiat(transaction.fill?.fee)
          : `$${transaction.fill?.fee}`
      }`,
      textColor: TextColor.Default,
    },
  ].filter(Boolean);

  if (transaction.fill?.pnl && transaction.fill?.action === 'Closed') {
    const pnlValue = BigNumber(transaction.fill?.pnl);
    const isPositive = pnlValue.isGreaterThanOrEqualTo(0);
    const absValue = Math.abs(parseFloat(transaction.fill?.pnl));

    // Determine the formatted value based on amount and sign
    let formattedValue: string;

    if (isPositive) {
      // Positive PnL
      if (pnlValue.isGreaterThan(0.01)) {
        formattedValue = formatPnl(transaction.fill?.pnl);
      } else {
        formattedValue = `+$${transaction.fill?.pnl}`;
      }
    } else if (pnlValue.isLessThan(-0.01)) {
      formattedValue = formatPnl(transaction.fill?.pnl);
    } else {
      formattedValue = `-$${absValue}`;
    }

    secondaryDetailRows.push({
      label: strings('perps.transactions.position.pnl'),
      value: formattedValue,
      textColor: isPositive ? TextColor.Success : TextColor.Error,
    });
  }

  // Points or Net P&L row - only show if values exist
  if (transaction.fill?.points) {
    secondaryDetailRows.push({
      label: strings('perps.transactions.position.points'),
      value: `+${transaction.fill?.points}`,
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
                    key={detail.label}
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
                    key={detail.label}
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
            label={strings('perps.transactions.view_on_explorer')}
            onPress={handleViewOnBlockExplorer}
            style={styles.blockExplorerButton}
          />
        </View>
      </ScrollView>
    </ScreenView>
  );
};

export default PerpsPositionTransactionView;
