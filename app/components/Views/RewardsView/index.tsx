import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
  });

interface RootStackParamList {
  [key: string]: undefined;
}

const RewardsView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { isLoggedIn, isLoading, login, logout, loginError, clearLoginError } =
    useRewardsAuth();

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.default} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView style={styles.container}>
        {isLoggedIn ? (
          <RewardsDashboard handleSignOut={logout} />
        ) : (
          <RewardsHero
            onOptIn={login}
            loginError={loginError}
            onClearError={clearLoginError}
          />
        )}
      </ScrollView>
    </SafeAreaView>
    );
};

export default RewardsView;
