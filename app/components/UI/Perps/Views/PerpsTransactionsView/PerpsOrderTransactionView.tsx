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

import { useSelector } from 'react-redux';
import { PerpsTransactionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import ScreenView from '../../../../Base/ScreenView';
import { getPerpsTransactionsDetailsNavbar } from '../../../Navbar';
import PerpsTransactionDetailAssetHero from '../../components/PerpsTransactionDetailAssetHero';
import { usePerpsBlockExplorerUrl, usePerpsOrderFees } from '../../hooks';
import { PerpsNavigationParamList } from '../../types/navigation';
import { PerpsOrderTransactionRouteProp } from '../../types/transactionHistory';
import {
  formatPerpsFiat,
  formatPositiveFiat,
  formatTransactionDate,
} from '../../utils/formatUtils';
import { styleSheet } from './PerpsOrderTransactionView.styles';

const PerpsOrderTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsOrderTransactionRouteProp>();
  const selectedInternalAccount = useSelector(
    selectSelectedInternalAccountByScope,
  )('eip155:1');
  const { getExplorerUrl } = usePerpsBlockExplorerUrl();
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
          <Text>{strings('perps.transactions.not_found')}</Text>
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

  // Main detail rows based on design
  const mainDetailRows = [
    {
      label: strings('perps.transactions.order.date'),
      value: formatTransactionDate(transaction.timestamp),
    },
    // Add order-specific fields when available from transaction data
    {
      label: strings('perps.transactions.order.size'),
      value: formatPerpsFiat(transaction.order?.size ?? 0),
    },
    {
      label: strings('perps.transactions.order.limit_price'),
      value: formatPositiveFiat(transaction.order?.limitPrice ?? 0),
    },
    {
      label: strings('perps.transactions.order.filled'),
      value: transaction.order?.filled,
    },
  ];

  const isFilled = transaction.order?.text === 'Filled';

  // Fee breakdown

  const feeRows = [
    {
      label: strings('perps.transactions.order.metamask_fee'),
      value: formatPositiveFiat(isFilled ? metamaskFee : 0),
    },
    {
      label: strings('perps.transactions.order.hyperliquid_fee'),
      value: formatPositiveFiat(isFilled ? protocolFee : 0),
    },
    {
      label: strings('perps.transactions.order.total_fee'),
      value: formatPositiveFiat(isFilled ? totalFee : 0),
    },
  ];

  return (
    <ScreenView>
      <ScrollView
        testID={PerpsTransactionSelectorsIDs.ORDER_TRANSACTION_VIEW}
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
            testID={PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON}
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

export default PerpsOrderTransactionView;
