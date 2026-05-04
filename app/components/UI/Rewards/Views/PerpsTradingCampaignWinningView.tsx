import React, { useMemo } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { usePerpsTradingCampaignParticipantOutcome } from '../hooks/usePerpsTradingCampaignParticipantOutcome';
import { strings } from '../../../../../locales/i18n';
import { formatOrdinalRank } from '../utils/formatUtils';
import CampaignWinningView from './CampaignWinningView';

const PRIZE_EMAIL = 'perpscampaign@consensys.net';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PerpsTradingCampaignWinningRouteParams = {
  RewardsPerpsTradingCampaignWinning: {
    campaignId: string;
    campaignName: string;
  };
};

export const PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS = {
  CONTAINER: 'perps-trading-campaign-winning-view-container',
} as const;

const PerpsTradingCampaignWinningView: React.FC = () => {
  const tw = useTailwind();
  const route =
    useRoute<
      RouteProp<
        PerpsTradingCampaignWinningRouteParams,
        'RewardsPerpsTradingCampaignWinning'
      >
    >();
  const { campaignId, campaignName } = route.params;

  const { outcome, isLoading: isOutcomeLoading } =
    usePerpsTradingCampaignParticipantOutcome(campaignId);
  const winningCode = outcome?.winnerVerificationCode ?? null;

  const rankDisplay = useMemo(() => {
    if (isOutcomeLoading && !outcome) {
      return null;
    }
    if (!outcome?.rank) {
      return '—';
    }
    return strings('rewards.campaign_winning.rank_label', {
      place: formatOrdinalRank(outcome.rank),
    });
  }, [outcome, isOutcomeLoading]);

  const renderRankSection = () => {
    if (rankDisplay === null) {
      return <Skeleton style={tw.style('h-8 w-36 rounded-lg')} />;
    }
    return (
      <Text
        variant={TextVariant.HeadingMd}
        color={TextColor.SuccessDefault}
        twClassName="text-center"
      >
        {rankDisplay}
      </Text>
    );
  };

  return (
    <CampaignWinningView
      testID={PERPS_TRADING_CAMPAIGN_WINNING_VIEW_TEST_IDS.CONTAINER}
      viewName="PerpsTradingCampaignWinningView"
      prizeEmail={PRIZE_EMAIL}
      campaignName={campaignName}
      campaignId={campaignId}
      analyticsPageType="perps_trading_campaign_winning"
      winningCode={winningCode}
      hasOutcomeLoaded={Boolean(outcome)}
      isLoading={isOutcomeLoading}
      renderRankSection={renderRankSection}
    />
  );
};

export default PerpsTradingCampaignWinningView;
