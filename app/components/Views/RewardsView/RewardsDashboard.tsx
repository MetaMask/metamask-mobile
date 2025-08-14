import React, { useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import TabBar from '../../../component-library/components-temp/TabBar';
import SummaryTab from './tabs/SummaryTab';
import RewardsTab from './tabs/RewardsTab';
import HistoryTab from './tabs/HistoryTab';
import ProfileTab from './tabs/ProfileTab';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    tabContainer: {
      paddingHorizontal: 16,
      flex: 1,
    },
    tabBar: {
      marginBottom: 8,
    },
    tabStyle: {
      paddingBottom: 8,
      paddingVertical: 8,
    },
    signedInContainer: {
      alignItems: 'center',
    },
  });

const RewardsDashboard: React.FC = () => {
  const navigation = useNavigation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const renderTabBar = useCallback(
    (tabBarProps: Record<string, unknown>) => (
      <TabBar
        style={styles.tabBar}
        {...tabBarProps}
        tabStyle={styles.tabStyle}
        textStyle={{
          ...(typography.sBodySMBold as TextStyle),
        }}
      />
    ),
    [styles, typography.sBodySMBold],
  );

  const onChangeTab = useCallback((_obj: ChangeTabProperties) => {
    // Handle tab change if needed
    // Analytics or other tab change logic can be added here
  }, []);

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.tabContainer}>
        <ScrollableTabView
          renderTabBar={renderTabBar}
          onChangeTab={onChangeTab}
          initialPage={0}
        >
          <SummaryTab key="summary-tab" tabLabel="Summary" />
          <RewardsTab key="rewards-tab" tabLabel="Rewards" />
          <HistoryTab key="history-tab" tabLabel="History" />
          <ProfileTab key="profile-tab" tabLabel="Profile" />
        </ScrollableTabView>
      </View>
    </SafeAreaView>
  );
};

export default RewardsDashboard;
