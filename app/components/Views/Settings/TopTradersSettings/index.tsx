import { HeaderStandard } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { Colors } from '../../../../util/theme/models';
import { useTheme } from '../../../../util/theme';
import SettingsDrawer from '../../../UI/SettingsDrawer';
import { TopTradersSettingsSelectorsIDs } from './TopTradersSettings.testIds';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
  });

/**
 * "Top Traders" app-settings screen. Explores surfacing leaderboard
 * preferences (starting with opt-out) from the global Settings list rather
 * than the trader-profile cog. The opt-out reuses the shared opt-out sheet.
 */
const TopTradersSettings = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOptOutPress = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.OPT_OUT);
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={styles.wrapper}
      testID={TopTradersSettingsSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings('app_settings.top_traders_title')}
        onBack={handleBack}
        backButtonProps={{
          testID: TopTradersSettingsSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView style={styles.wrapper}>
        <SettingsDrawer
          title={strings('social_leaderboard.opt_out.cta')}
          description={strings('social_leaderboard.opt_out.description')}
          onPress={handleOptOutPress}
          testID={TopTradersSettingsSelectorsIDs.OPT_OUT_ROW}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default TopTradersSettings;
