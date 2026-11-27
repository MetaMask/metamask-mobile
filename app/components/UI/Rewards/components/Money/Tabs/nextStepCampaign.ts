import { IconName } from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import type { ReferralLocalizedText } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { formatCampaignDate } from '../../Campaigns/CampaignTile.utils';
import type { EarnActionRow } from './earnActionRows';

/** Key of the campaign row in Next steps. */
export const NEXT_STEP_CAMPAIGN_KEY = 'campaign';

/** The details screens a campaign can open. */
export type CampaignDetailsRoute =
  | typeof Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW
  | typeof Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW
  | typeof Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW
  | typeof Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW
  | typeof Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW;

/** The details screen each campaign type opens. */
const CAMPAIGN_DETAILS_ROUTE: Partial<
  Record<CampaignType, CampaignDetailsRoute>
> = {
  [CampaignType.ONDO_HOLDING]: Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
  [CampaignType.SEASON_1]: Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
  [CampaignType.PERPS_TRADING]:
    Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
  [CampaignType.PREDICT_THE_PITCH]:
    Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
  [CampaignType.MONEY_ACCOUNT_SWEEPSTAKES]:
    Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
};

/** The details route for a campaign, or null when its type has no screen. */
export function campaignDetailsRoute(
  campaign: CampaignDto,
): CampaignDetailsRoute | null {
  return CAMPAIGN_DETAILS_ROUTE[campaign.type] ?? null;
}

/**
 * The campaign Next steps offers: of the active campaigns that have a details
 * screen to open, the one that started most recently.
 */
export function latestOpenableCampaign(
  active: readonly CampaignDto[],
): CampaignDto | null {
  return active
    .filter((campaign) => campaignDetailsRoute(campaign) !== null)
    .reduce<CampaignDto | null>(
      (latest, campaign) =>
        !latest || new Date(campaign.startDate) > new Date(latest.startDate)
          ? campaign
          : latest,
      null,
    );
}

/**
 * The Next steps row for a user who has not opted in to Rewards. It takes the
 * campaign row's place and opens the Campaigns tab, where the opt-in is.
 */
export function optInActionRow(
  localizedText: Pick<
    Partial<ReferralLocalizedText>,
    'invitedOptInTitle' | 'invitedOptInDescription'
  >,
): EarnActionRow<typeof NEXT_STEP_CAMPAIGN_KEY> {
  return {
    key: NEXT_STEP_CAMPAIGN_KEY,
    iconName: IconName.Trophy,
    title:
      localizedText.invitedOptInTitle ??
      strings('rewards.campaign.opt_in_section_title'),
    description:
      localizedText.invitedOptInDescription ??
      strings('rewards.campaign.opt_in_section_description'),
  };
}

/** The Next steps row that invites the user into a live campaign. */
export function campaignActionRow(
  campaign: CampaignDto,
): EarnActionRow<typeof NEXT_STEP_CAMPAIGN_KEY> {
  return {
    key: NEXT_STEP_CAMPAIGN_KEY,
    iconName: IconName.Trophy,
    title: strings('rewards.campaign.join_campaign', {
      campaignName: campaign.name,
    }),
    description: strings('rewards.campaign.live_until_date', {
      date: formatCampaignDate(new Date(campaign.endDate)),
    }),
  };
}
