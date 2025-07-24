import React from 'react';
import { View, ScrollView } from 'react-native';
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
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import type { Theme } from '../../../../../util/theme/models';
import ScreenView from '../../../../Base/ScreenView';
import { PerpsNavigationParamList } from '../../types/navigation';

interface PerpsTransaction {
  id: string;
  type: 'trade' | 'order' | 'funding';
  category: 'position_open' | 'position_close' | 'limit_order' | 'funding_fee';
  title: string;
  status: 'Completed' | 'Placed' | 'Queued';
  timestamp: number;
  amount: string;
  amountUSD: string;
  asset: string;
  leverage?: string;
  isPositive: boolean;
}

type PerpsPositionTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsPositionTransaction'
>;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    assetContainer: {
      alignItems: 'center' as const,
      paddingVertical: 24,
      marginBottom: 24,
    },
    assetRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    assetIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: colors.primary.default,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    assetAmount: {
      fontSize: 18,
      fontWeight: '500' as const,
      color: colors.text.default,
    },
    assetAmountProfit: {
      color: colors.success.default,
    },
    assetAmountLoss: {
      color: colors.text.default,
    },
    arrowIcon: {
      marginHorizontal: 16,
    },
    statusContainer: {
      alignItems: 'center' as const,
      marginBottom: 32,
    },
    statusText: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    statusConfirmed: {
      color: colors.success.default,
    },
    statusQueued: {
      color: colors.text.muted,
    },
    detailsContainer: {
      flex: 1,
    },
    detailRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border.muted,
    },
    detailLabel: {
      fontSize: 16,
      color: colors.text.default,
    },
    detailValue: {
      fontSize: 16,
      color: colors.text.muted,
    },
    blockExplorerButton: {
      marginTop: 24,
      marginBottom: 32,
    },
  };
};

const PerpsPositionTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsPositionTransactionRouteProp>();

  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;

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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return styles.statusConfirmed;
      case 'Queued':
        return styles.statusQueued;
      default:
        return styles.statusConfirmed;
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewOnBlockExplorer = () => {
    // TODO: Implement block explorer navigation
    console.log(
      'Navigate to block explorer for position transaction:',
      transaction.id,
    );
  };

  const detailRows = [
    { label: 'Status', value: transaction.status },
    { label: 'Date', value: formatDate(transaction.timestamp) },
    { label: 'Network fee', value: '$' },
    { label: 'MetaMask fee', value: '$' },
    { label: 'Provider fee', value: '$' },
  ];

  return (
    <ScreenView>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Asset display */}
          <View style={styles.assetContainer}>
            <View style={styles.assetRow}>
              <View style={styles.assetIcon}>
                <Icon
                  name={transaction.asset === 'ETH' ? IconName.Ethereum : IconName.Ethereum}
                  size={IconSize.Sm}
                  color={IconColor.Inverse}
                />
              </View>
              <Text style={styles.assetAmount}>
                {transaction.amount}
              </Text>
            </View>

            {transaction.amountUSD && (
              <>
                <View style={styles.arrowIcon}>
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Sm}
                    color={IconColor.Default}
                  />
                </View>
                <View style={styles.assetRow}>
                  <View style={styles.assetIcon}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      $
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.assetAmount,
                      transaction.isPositive
                        ? styles.assetAmountProfit
                        : styles.assetAmountLoss,
                    ]}
                  >
                    {transaction.amountUSD}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Status */}
          <View style={styles.statusContainer}>
            <Text
              style={[styles.statusText, getStatusStyle(transaction.status)]}
            >
              {transaction.status}
            </Text>
          </View>

          {/* Transaction details */}
          <View style={styles.detailsContainer}>
            {detailRows.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
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

export default PerpsPositionTransactionView;
