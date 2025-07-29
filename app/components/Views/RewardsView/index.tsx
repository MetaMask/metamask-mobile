import React, { useEffect } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import { SafeAreaView } from 'react-native-safe-area-context';
import RewardsHero from './RewardsHero';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import RewardsDashboard from './RewardsDashboard';
import { useRewardsAuth } from '../../../core/Engine/controllers/rewards-controller/hooks/useRewardsAuth';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
  });

const RewardsView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { isLoggedIn, login, logout } = useRewardsAuth();

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {isLoggedIn ? (
          <RewardsDashboard handleSignOut={logout} />
        ) : (
          <RewardsHero onOptIn={login} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RewardsView;
