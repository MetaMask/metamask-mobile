import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import ReferralDetails from '../components/ReferralDetails/ReferralDetails';
import { useSeasonStatus } from '../hooks/useSeasonStatus';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useSelector } from 'react-redux';

const ReferralRewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  // Sync rewards controller state with UI store
  useSeasonStatus({
    subscriptionId: subscriptionId || '',
    seasonId: 'current',
  });

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.referral_title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
    });
  }, [colors, navigation]);

  return (
    <ErrorBoundary navigation={navigation} view="ReferralRewardsView">
      <SafeAreaView style={tw.style('flex-1 bg-default px-4 -mt-8')}>
        <ReferralDetails />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ReferralRewardsView;
