import React from 'react';
import { View, ScrollView } from 'react-native';
import { NavigationProp, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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

type PerpsFundingTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsFundingTransaction'
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
    statusContainer: {
      alignItems: 'center' as const,
      paddingVertical: 24,
      marginBottom: 24,
    },
    statusText: {
      fontSize: 18,
      fontWeight: '500' as const,
      color: colors.success.default,
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

const PerpsFundingTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsFundingTransactionRouteProp>();

  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;

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
    // TODO: Implement block explorer navigation
    console.log('Navigate to block explorer for funding transaction:', transaction.id);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const detailRows = [
    { label: 'Status', value: transaction.status },
    { 
      label: 'Position', 
      value: `0.5 ${transaction.asset} Long ${transaction.leverage || '10x'}` 
    },
    { label: 'Date', value: formatDate(transaction.timestamp) },
    { label: 'Fee', value: '$' },
  ];

  return (
    <ScreenView>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {transaction.status === 'Completed' ? 'Confirmed' : transaction.status}
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

export default PerpsFundingTransactionView;