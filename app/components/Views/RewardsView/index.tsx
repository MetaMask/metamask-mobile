import React, { useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import { SafeAreaView } from 'react-native-safe-area-context';
import RewardsHero from './RewardsHero';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';

import {
  useRewardsAuth,
  REWARDS_SIGNUP_PREFIX,
} from '../../../core/Engine/controllers/rewards-controller/hooks/useRewardsAuth';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import Routes from '../../../constants/navigation/Routes';

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

const RewardsView: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const { isLoggedIn, isLoading, login, loginError, clearLoginError } =
    useRewardsAuth({
      onLoginSuccess: () => {
        navigation.navigate(Routes.REWARDS_DASHBOARD);
      },
    });

  // Navigate to dashboard if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    }
  }, [isLoggedIn, navigation]);

  const handleSignUpClick = useCallback(async () => {
    if (!address) return;

    try {
      const hasSeenTerms = await AsyncStorage.getItem(
        `${REWARDS_SIGNUP_PREFIX}-${address}`,
      );
      if (hasSeenTerms) {
        // User has already seen terms, proceed with login
        login();
      } else {
        // Navigate to terms screen first
        navigation.navigate(Routes.REWARDS_TERMS);
      }
    } catch (error) {
      // If AsyncStorage fails, show terms to be safe
      navigation.navigate(Routes.REWARDS_TERMS);
    }
  }, [address, login, navigation]);

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
      <ScrollView style={styles.container}>
        <RewardsHero
          onOptIn={handleSignUpClick}
          loginError={loginError}
          onClearError={clearLoginError}
          isLoading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default RewardsView;
