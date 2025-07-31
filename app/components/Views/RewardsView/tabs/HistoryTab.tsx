import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollContainer: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 12,
    },
    historyItem: {
      backgroundColor: colors.background.alternative,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyInfo: {
      flex: 1,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 4,
    },
    historyDate: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    historyAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.success.default,
    },
    emptyState: {
      backgroundColor: colors.background.alternative,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.alternative,
      textAlign: 'center',
    },
    filterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    filterButton: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
    },
    filterButtonActive: {
      backgroundColor: colors.primary.default,
    },
    filterText: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    filterTextActive: {
      color: colors.primary.inverse,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 4,
    },
    statusBadgeCompleted: {
      backgroundColor: colors.success.muted,
    },
    statusBadgePending: {
      backgroundColor: colors.warning.muted,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    statusTextCompleted: {
      color: colors.success.default,
    },
    statusTextPending: {
      color: colors.warning.default,
    },
  });

interface HistoryTabProps {
  tabLabel: string;
}

const HistoryTab: React.FC<HistoryTabProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Mock data - replace with actual history data
  const historyItems = [
    {
      id: '1',
      title: 'Trading Reward',
      date: 'Dec 15, 2024',
      amount: '+0.001 ETH',
      status: 'completed' as const,
    },
    {
      id: '2',
      title: 'Staking Reward',
      date: 'Dec 10, 2024',
      amount: '+0.002 ETH',
      status: 'completed' as const,
    },
    {
      id: '3',
      title: 'Referral Bonus',
      date: 'Dec 8, 2024',
      amount: '+0.005 ETH',
      status: 'pending' as const,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {historyItems.length > 0 ? (
            historyItems.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'completed'
                        ? styles.statusBadgeCompleted
                        : styles.statusBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.status === 'completed'
                          ? styles.statusTextCompleted
                          : styles.statusTextPending,
                      ]}
                    >
                      {item.status === 'completed' ? 'Completed' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyAmount}>{item.amount}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No reward history available yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default HistoryTab;