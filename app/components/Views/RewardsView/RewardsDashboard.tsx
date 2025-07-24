import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 15,
    },
    rewardCard: {
      backgroundColor: colors.background.alternative,
      padding: 20,
      borderRadius: 8,
      alignItems: 'center',
    },
    rewardAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.primary.default,
    },
    rewardLabel: {
      fontSize: 14,
      color: colors.text.alternative,
      marginTop: 5,
    },
    historyItem: {
      backgroundColor: colors.background.alternative,
      padding: 15,
      borderRadius: 8,
    },
    historyText: {
      fontSize: 14,
      color: colors.text.alternative,
      textAlign: 'center',
    },
    signedInText: {
      fontSize: 16,
      color: colors.success.default,
      fontWeight: '600',
      marginBottom: 8,
    },
    signOutButton: {
      backgroundColor: colors.error.default,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    signOutButtonText: {
      color: colors.error.inverse,
      fontSize: 14,
      fontWeight: '500',
    },
  });

interface RewardsDashboardProps {
  handleSignOut: () => void;
}

const RewardsDashboard: React.FC<RewardsDashboardProps> = ({
  handleSignOut,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rewards</Text>
        <View style={styles.rewardCard}>
          <Text style={styles.rewardAmount}>0 ETH</Text>
          <Text style={styles.rewardLabel}>Total Earned</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reward History</Text>
        <View style={styles.historyItem}>
          <Text style={styles.historyText}>No rewards history yet</Text>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.signedInText}>✓ You're signed in to rewards!</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RewardsDashboard;
