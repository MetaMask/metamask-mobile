import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';

interface RewardsHeroProps {
  onOptIn: () => void;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    heroContainer: {
      backgroundColor: colors.background.alternative,
      paddingVertical: 40,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    heroTitle: {
      fontSize: Device.isAndroid() ? 28 : 32,
      fontWeight: 'bold',
      color: colors.text.default,
      textAlign: 'center',
      marginBottom: 12,
    },
    heroSubtitle: {
      fontSize: 18,
      color: colors.primary.default,
      textAlign: 'center',
      marginBottom: 16,
      fontWeight: '600',
    },
    heroDescription: {
      fontSize: 16,
      color: colors.text.alternative,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
      maxWidth: 300,
    },
    ctaButton: {
      backgroundColor: colors.primary.default,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      shadowColor: colors.shadow.default,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    ctaButtonText: {
      color: colors.primary.inverse,
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    featuresContainer: {
      marginTop: 32,
      width: '100%',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    featureIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    featureIconText: {
      color: colors.primary.inverse,
      fontSize: 14,
      fontWeight: 'bold',
    },
    featureText: {
      fontSize: 16,
      color: colors.text.default,
      flex: 1,
    },
  });

const RewardsHero: React.FC<RewardsHeroProps> = ({ onOptIn }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.heroContainer}>
      <Text style={styles.heroTitle}>Unlock Your Rewards</Text>
      <Text style={styles.heroSubtitle}>Start Earning Today</Text>
      <Text style={styles.heroDescription}>
        Join thousands of users earning rewards through staking, liquidity
        provision, and exclusive MetaMask programs.
      </Text>

      <TouchableOpacity style={styles.ctaButton} onPress={onOptIn}>
        <Text style={styles.ctaButtonText}>Get Started</Text>
      </TouchableOpacity>

      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>✓</Text>
          </View>
          <Text style={styles.featureText}>Earn rewards on your ETH holdings</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>✓</Text>
          </View>
          <Text style={styles.featureText}>Access exclusive DeFi opportunities</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>✓</Text>
          </View>
          <Text style={styles.featureText}>Track your earnings in real-time</Text>
        </View>
      </View>
    </View>
  );
};

export default RewardsHero;
