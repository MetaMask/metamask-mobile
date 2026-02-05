import { useNavigation, useRoute } from '@react-navigation/native';
import { BigNumber } from 'bignumber.js';
import React, { useLayoutEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
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
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import ScreenView from '../../../../Base/ScreenView';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import PerpsTransactionDetailAssetHero from '../../components/PerpsTransactionDetailAssetHero';
import { usePerpsBlockExplorerUrl } from '../../hooks';
import {
  PerpsFundingTransactionRouteProp,
  PerpsTransaction,
} from '../../types/transactionHistory';
import {
  formatPerpsFiat,
  formatTransactionDate,
} from '../../utils/formatUtils';
import { styleSheet } from './PerpsFundingTransactionView.styles';

const PerpsFundingTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();
  const route = useRoute<PerpsFundingTransactionRouteProp>();

  const selectedInternalAccount = useSelector(
    selectSelectedInternalAccountByScope,
  )('eip155:1');
  const { getExplorerUrl } = usePerpsBlockExplorerUrl();

  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Check if transaction exists before proceeding
  if (!transaction) {
    return (
      <ScreenView>
        <HeaderCenter includesTopInset onBack={() => navigation.goBack()} />
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

  const feeNumber = transaction.fundingAmount?.feeNumber || 0;

  // Funding detail rows based on design
  const detailRows = [
    {
      label: strings('perps.transactions.funding.date'),
      value: formatTransactionDate(transaction.timestamp),
    },
    {
      label: strings('perps.transactions.funding.fee'),
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
    {
      label: strings('perps.transactions.funding.rate'),
      value: transaction.fundingAmount?.rate,
    },
  ];

  return (
    <ScreenView>
      <HeaderCenter
        includesTopInset
        title={transaction.title}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        testID={PerpsTransactionSelectorsIDs.FUNDING_TRANSACTION_VIEW}
        style={styles.container}
      >
        <View style={styles.content}>
          <PerpsTransactionDetailAssetHero
            transaction={transaction}
            styles={styles}
          />

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
            label={strings('perps.transactions.view_on_explorer')}
            onPress={handleViewOnBlockExplorer}
            style={styles.blockExplorerButton}
          />
        </View>
      </ScrollView>
    </ScreenView>
  );
};

export default PerpsFundingTransactionView;
