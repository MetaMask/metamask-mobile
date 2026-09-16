import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React, { useLayoutEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';

import { useSelector } from 'react-redux';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import ScreenView from '../../../../Base/ScreenView';
import PerpsTransactionDetailAssetHero from '../../components/PerpsTransactionDetailAssetHero';
import {
  usePerpsBlockExplorerUrl,
  usePerpsRecordedOrderFees,
} from '../../hooks';
import { PerpsOrderTransactionRouteProp } from '../../types/transactionHistory';
import {
  formatPerpsFiat,
  formatTransactionDate,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  getOrderPriceRowVisibility,
  getValidPerpsPrice,
  resolvePerpsTransactionOrderType,
} from '../../utils/orderUtils';
import { styleSheet } from './PerpsOrderTransactionView.styles';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../providers/PerpsStreamManager';

interface PerpsOrderDetailRow {
  key: string;
  label: string;
  value: string | number | undefined;
  testID?: string;
}

const PerpsOrderTransactionViewContent: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route = useRoute<PerpsOrderTransactionRouteProp>();
  const selectedInternalAccount = useSelector(
    selectSelectedInternalAccountByScope,
  )('eip155:1');
  const { getExplorerUrl } = usePerpsBlockExplorerUrl();
  // Get transaction from route params
  const transaction = route.params?.transaction;

  // Call hooks before conditional return
  const {
    totalFee,
    isLoading: isFeeLoading,
    hasError: hasFeeError,
  } = usePerpsRecordedOrderFees(
    transaction?.order?.orderId,
    transaction?.asset ?? '',
    transaction?.timestamp,
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  if (!transaction) {
    return (
      <ScreenView>
        <HeaderStandard includesTopInset onBack={() => navigation.goBack()} />
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
    trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
      location: 'perps_transaction_details',
      text: strings('perps.transactions.view_on_explorer'),
      url: explorerUrl,
    });
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: explorerUrl,
      },
    });
  };

  const order = transaction.order;
  const orderType = order ? resolvePerpsTransactionOrderType(order) : undefined;
  const { showTriggerPrice, showLimitPrice } =
    getOrderPriceRowVisibility(orderType);

  const priceRows: PerpsOrderDetailRow[] = [];
  if (order && showTriggerPrice) {
    const triggerPrice = getValidPerpsPrice(order.triggerPrice);
    if (triggerPrice !== null) {
      priceRows.push({
        key: 'trigger-price',
        label: strings('perps.order.trigger_price'),
        value: formatPerpsFiat(triggerPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        }),
        testID: PerpsTransactionSelectorsIDs.TRIGGER_PRICE_ROW,
      });
    }
  }

  if (order && showLimitPrice) {
    const limitPrice = getValidPerpsPrice(order.limitPrice);
    if (limitPrice !== null) {
      priceRows.push({
        key: 'limit-price',
        label: strings('perps.transactions.order.limit_price'),
        value: formatPerpsFiat(limitPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        }),
        testID: PerpsTransactionSelectorsIDs.LIMIT_PRICE_ROW,
      });
    }
  }

  // Main detail rows based on design
  const mainDetailRows: PerpsOrderDetailRow[] = [
    {
      key: 'date',
      label: strings('perps.transactions.order.date'),
      value: formatTransactionDate(transaction.timestamp),
    },
    {
      key: 'size',
      label: strings('perps.transactions.order.size'),
      value: formatPerpsFiat(transaction.order?.size ?? 0),
    },
    ...priceRows,
    {
      key: 'filled',
      label: strings('perps.transactions.order.filled'),
      value: transaction.order?.filled,
    },
  ];

  // Use universal ranges to show the exact recorded fee instead of "< $0.01".
  const formatFee = (fee: number) =>
    formatPerpsFiat(fee, { ranges: PRICE_RANGES_UNIVERSAL });

  const feeValue =
    isFeeLoading || hasFeeError || totalFee === undefined
      ? '—'
      : formatFee(totalFee);

  const feeRows = [
    {
      label: strings('perps.transactions.order.total_fee'),
      value: feeValue,
    },
  ];

  return (
    <ScreenView>
      <HeaderStandard
        includesTopInset
        title={transaction.title}
        onBack={() => navigation.goBack()}
      />
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
                key={detail.key}
                testID={detail.testID}
                style={[
                  styles.detailRow,
                  index === mainDetailRows.length - 1 && styles.detailRowLast,
                ]}
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {detail.label}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                >
                  {detail.value}
                </Text>
              </View>
            ))}

            {/* Separator between sections */}
            <View style={styles.sectionSeparator} />

            {/* Recorded execution fee */}
            {feeRows.map((detail, index) => (
              <View
                key={`fee-${index}`}
                style={[
                  styles.detailRow,
                  index === feeRows.length - 1 && styles.detailRowLast,
                ]}
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {detail.label}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                >
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Block explorer button */}
          <Button
            testID={PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON}
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleViewOnBlockExplorer}
            style={styles.blockExplorerButton}
          >
            {strings('perps.transactions.view_on_explorer')}
          </Button>
        </View>
      </ScrollView>
    </ScreenView>
  );
};

const PerpsOrderTransactionView: React.FC = () => (
  <PerpsConnectionProvider suppressErrorView>
    <PerpsStreamProvider>
      <PerpsOrderTransactionViewContent />
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

export default PerpsOrderTransactionView;
