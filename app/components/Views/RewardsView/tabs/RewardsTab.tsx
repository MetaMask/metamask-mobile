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
    rewardCard: {
      backgroundColor: colors.background.alternative,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rewardInfo: {
      flex: 1,
    },
    rewardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 4,
    },
    rewardDescription: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    rewardAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary.default,
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
    availableRewardsCard: {
      backgroundColor: colors.primary.muted,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    availableAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary.default,
    },
    availableLabel: {
      fontSize: 14,
      color: colors.text.alternative,
      marginTop: 4,
    },
  });

interface RewardsTabProps {
  tabLabel: string;
}

const RewardsTab: React.FC<RewardsTabProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Mock data - replace with actual rewards data
  const availableRewards = [
    {
      id: '1',
      title: 'Trading Rewards',
      description: 'Earn rewards for trading activities',
      amount: '0.001 ETH',
    },
    {
      id: '2',
      title: 'Staking Rewards',
      description: 'Rewards from staking activities',
      amount: '0.002 ETH',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available to Claim</Text>
          <View style={styles.availableRewardsCard}>
            <Text style={styles.availableAmount}>0.003 ETH</Text>
            <Text style={styles.availableLabel}>Ready to claim</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reward Opportunities</Text>
          {availableRewards.length > 0 ? (
            availableRewards.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                </View>
                <Text style={styles.rewardAmount}>{reward.amount}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No reward opportunities available at the moment
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default RewardsTab;