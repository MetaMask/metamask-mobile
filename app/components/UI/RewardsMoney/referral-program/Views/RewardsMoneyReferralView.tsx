import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { navigateToRewardsRoute } from '../../../Rewards/utils';
import useRewardsToast from '../../../Rewards/hooks/useRewardsToast';
import type { ReferralMeDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REFERRER_ORIGIN_TYPES, REWARDS_MONEY_TEST_IDS } from '../../constants';
import ReferralCodeCard from '../components/ReferralCodeCard';
import ReferralRatesRow from '../components/ReferralRatesRow';
import ShareReferralLinkButton from '../components/ShareReferralLinkButton';

interface RewardsMoneyReferralViewProps {
  me: ReferralMeDto;
}

/**
 * The referrer screen: code, rates, share link, and the way through to
 * earnings.
 */
const RewardsMoneyReferralView: React.FC<RewardsMoneyReferralViewProps> = ({
  me,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const handleCopied = useCallback(() => {
    showToast(
      RewardsToastOptions.success(
        strings('rewards_money.referral.code_copied'),
      ),
    );
  }, [RewardsToastOptions, showToast]);

  const handleViewEarnings = useCallback(() => {
    navigateToRewardsRoute(navigation, Routes.REWARDS_MONEY_EARNINGS_VIEW, {
      originTypes: REFERRER_ORIGIN_TYPES,
    });
  }, [navigation]);

  return (
    <ScrollView
      style={tw.style('flex-1')}
      contentContainerStyle={tw.style('px-4 pb-8 gap-4')}
      testID={REWARDS_MONEY_TEST_IDS.REFERRAL_VIEW}
    >
      <Box twClassName="gap-2">
        <Text variant={TextVariant.HeadingLg}>
          {strings('rewards_money.referral.title')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('rewards_money.referral.description')}
        </Text>
      </Box>

      {me.referral_code ? (
        <ReferralCodeCard code={me.referral_code} onCopied={handleCopied} />
      ) : null}

      <ReferralRatesRow rates={me.earn_rates} />

      {me.referral_code?.share_url ? (
        <ShareReferralLinkButton shareUrl={me.referral_code.share_url} />
      ) : null}

      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={handleViewEarnings}
        twClassName="w-full"
        testID={REWARDS_MONEY_TEST_IDS.EARNINGS_CTA}
      >
        {strings('rewards_money.referral.view_earnings')}
      </Button>
    </ScrollView>
  );
};

export default RewardsMoneyReferralView;
