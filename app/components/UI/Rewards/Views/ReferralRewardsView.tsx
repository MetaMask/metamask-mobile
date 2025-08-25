import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { useRewardsSyncWithEngine } from '../hooks/useRewardsSyncWithEngine';
import ReferralDetails from '../components/ReferralDetails/ReferralDetails';

const ReferralRewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Sync rewards controller state with UI store
  useRewardsSyncWithEngine();

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('rewards.referral_rewards_title'),
        navigation,
        true, // Show back button
        colors,
      ),
    );
  }, [colors, navigation]);

  return (
    <ErrorBoundary navigation={navigation} view="ReferralRewardsView">
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        {/* Referral Tab Content */}
        <Box twClassName="flex-1 px-4">
          <ReferralDetails />
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ReferralRewardsView;
