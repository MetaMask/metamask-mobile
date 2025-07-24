import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import { SafeAreaView } from 'react-native-safe-area-context';
import RewardsHero from './RewardsHero';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import RewardsDashboard from './RewardsDashboard';

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

  // Mock signed-in state
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);

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

  console.log('isSignedIn', isSignedIn);

  const handleOptIn = (): void => {
    setIsSignedIn(true);
  };

  const handleSignOut = (): void => {
    setIsSignedIn(false);
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {isSignedIn ? (
          <RewardsDashboard handleSignOut={handleSignOut} />
        ) : (
          <RewardsHero onOptIn={handleOptIn} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RewardsView;