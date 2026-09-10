import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  HeaderStandard,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import RewardsErrorBanner from '../../Rewards/components/RewardsErrorBanner';
import { strings } from '../../../../../locales/i18n';
import {
  REFERRAL_PROGRAM_EARN_ORIGIN_TYPES,
  REWARDS_MONEY_TEST_IDS,
} from '../constants';
import useRewardsMoneyMe from '../hooks/useRewardsMoneyMe';
import RewardsMoneyReferralView from '../referral-program/Views/RewardsMoneyReferralView';
import ReferralEntryState from '../referral-program/components/ReferralEntryState';
import RewardsMoneyEarningsView from '../earnings/Views/RewardsMoneyEarningsView';

/**
 * Routes the money surface to the right variant.
 *
 * The server returns `variant` alongside `role`, so the `BOTH` policy can
 * change without an app release. A referee gets the merged screen — earnings
 * only, no code and no share link — rather than an extra tap through a referral
 * screen that would have nothing on it.
 */
const RewardsMoneyView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { me, isLoading, error, refresh } = useRewardsMoneyMe();

  const renderBody = () => {
    if (isLoading && !me) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
          testID={REWARDS_MONEY_TEST_IDS.LOADING}
        >
          <ActivityIndicator />
        </Box>
      );
    }

    if (error || !me) {
      return (
        <Box twClassName="px-4 pt-4" testID={REWARDS_MONEY_TEST_IDS.ERROR}>
          <RewardsErrorBanner
            title={strings('rewards_money.error_title')}
            description={strings('rewards_money.error_description')}
            onConfirm={refresh}
            confirmButtonLabel={strings('rewards_money.retry')}
          />
        </Box>
      );
    }

    switch (me.variant) {
      case 'REFERRER':
        return <RewardsMoneyReferralView me={me} />;
      case 'REFEREE':
        return (
          <RewardsMoneyEarningsView
            originTypes={REFERRAL_PROGRAM_EARN_ORIGIN_TYPES.REFEREE}
            embedded
          />
        );
      default:
        return <ReferralEntryState />;
    }
  };

  return (
    <ErrorBoundary navigation={navigation} view="RewardsMoneyView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_MONEY_TEST_IDS.VIEW}
      >
        <HeaderStandard
          title={strings('rewards_money.title')}
          titleProps={{ variant: TextVariant.HeadingSm }}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'rewards-money-back-button' }}
          includesTopInset
        />
        {renderBody()}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsMoneyView;
