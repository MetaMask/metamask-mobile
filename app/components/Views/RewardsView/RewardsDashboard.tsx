import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import { useRewardsAuth } from '../../../core/Engine/controllers/rewards-controller/hooks/useRewardsAuth';
import Routes from '../../../constants/navigation/Routes';

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
    signOutButtonContainer: {
      marginTop: 8,
    },
    signedInContainer: {
      alignItems: 'center',
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
  });

const RewardsDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { isLoggedIn, isLoading, logout } = useRewardsAuth();

  // Redirect to main rewards view if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.navigate(Routes.REWARDS_VIEW);
    }
  }, [isLoggedIn, navigation]);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.rewards_title') || 'Rewards',
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation]);

  return (
    <SafeAreaView style={styles.wrapper}>
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
        <View style={styles.signedInContainer}>
          <Text style={styles.signedInText}>
            ✓ You&apos;re signed in to rewards!
          </Text>
          <View style={styles.signOutButtonContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              label="Sign Out"
              onPress={logout}
              loading={isLoading}
            />
          </View>
        </View>
       </View>
     </SafeAreaView>
   );
};

export default RewardsDashboard;
