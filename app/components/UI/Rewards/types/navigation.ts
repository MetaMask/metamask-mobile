import type { NavigatorScreenParams } from '@react-navigation/native';
import type { RewardsSelectSheetParams } from '../components/RewardsSelectSheet';

export interface RewardsOndoCampaignDetailsParams {
  campaignId?: string;
}

export interface RewardsOndoCampaignWinningParams {
  campaignId: string;
  campaignName?: string;
}

export interface RewardsSeasonOneCampaignDetailsParams {
  campaignId?: string;
}

export interface RewardsCampaignMechanicsParams {
  campaignId: string;
}

export interface RewardsOndoCampaignLeaderboardParams {
  campaignId: string;
}

export interface RewardsOndoCampaignPortfolioParams {
  campaignId: string;
}

export interface RewardsOndoCampaignStatsParams {
  campaignId: string;
  campaignName?: string;
}

export interface RewardsOndoRwaAssetSelectorParams {
  mode: 'swap' | 'open_position';
  srcTokenAsset?: string;
  srcTokenSymbol?: string;
  srcTokenName?: string;
  srcTokenDecimals?: number;
  campaignId: string;
}

export interface RewardsCampaignTourStepParams {
  campaignId: string;
}

export interface RewardsPerpsTradingCampaignDetailsParams {
  campaignId?: string;
}

export interface RewardsPerpsTradingCampaignWinningParams {
  campaignId: string;
  campaignName: string;
}

export interface RewardsPerpsTradingCampaignLeaderboardParams {
  campaignId: string;
}

export interface RewardsPerpsTradingCampaignStatsParams {
  campaignId: string;
}

export interface RewardsPredictThePitchCampaignDetailsParams {
  campaignId?: string;
}

export interface RewardsPredictThePitchCampaignWinningParams {
  campaignId: string;
  campaignName: string;
}

export interface RewardsPredictThePitchCampaignLeaderboardParams {
  campaignId: string;
}

export interface RewardsPredictThePitchCampaignPortfolioParams {
  campaignId: string;
}

export interface RewardsPredictThePitchCampaignStatsParams {
  campaignId: string;
}

/**
 * Param list for screens registered in `RewardsNavigator`.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsStackParamList = {
  ReferralRewardsView: undefined;
  RewardsSettingsView: undefined;
  RewardsVipSplashView: undefined;
  RewardsVipView: undefined;
  RewardsVipTiersView: undefined;
  RewardsVipRefereeSplashView: undefined;
  RewardsVipRefereeView: undefined;
  RewardsCampaignsView: undefined;
  RewardsCampaignTourStep: RewardsCampaignTourStepParams;
  RewardsCampaignDetails: RewardsOndoCampaignDetailsParams | undefined;
  RewardsOndoCampaignWinning: RewardsOndoCampaignWinningParams;
  RewardsSeasonOneCampaignDetails:
    | RewardsSeasonOneCampaignDetailsParams
    | undefined;
  RewardsCampaignMechanics: RewardsCampaignMechanicsParams;
  RewardsMusdCalculatorView: undefined;
  RewardsOndoCampaignLeaderboard: RewardsOndoCampaignLeaderboardParams;
  RewardsOndoRwaAssetSelector: RewardsOndoRwaAssetSelectorParams;
  RewardsOndoCampaignPortfolioView: RewardsOndoCampaignPortfolioParams;
  RewardsOndoCampaignStats: RewardsOndoCampaignStatsParams;
  RewardsPerpsTradingCampaignDetails:
    | RewardsPerpsTradingCampaignDetailsParams
    | undefined;
  RewardsPerpsTradingCampaignLeaderboard: RewardsPerpsTradingCampaignLeaderboardParams;
  RewardsPerpsTradingCampaignStats: RewardsPerpsTradingCampaignStatsParams;
  RewardsPerpsTradingCampaignWinning: RewardsPerpsTradingCampaignWinningParams;
  RewardsPredictThePitchCampaignDetails:
    | RewardsPredictThePitchCampaignDetailsParams
    | undefined;
  RewardsPredictThePitchCampaignLeaderboard: RewardsPredictThePitchCampaignLeaderboardParams;
  RewardsPredictThePitchCampaignPortfolioView: RewardsPredictThePitchCampaignPortfolioParams;
  RewardsPredictThePitchCampaignWinning: RewardsPredictThePitchCampaignWinningParams;
  RewardsPredictThePitchCampaignStats: RewardsPredictThePitchCampaignStatsParams;
};

/**
 * Feature-level Rewards navigation params: stack screens, flat modal sheet,
 * and the typed `RewardsFlow` entry for cross-stack navigation.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsNavigationParamList = RewardsStackParamList & {
  RewardsSelectSheet: RewardsSelectSheetParams;
  RewardsFlow: NavigatorScreenParams<RewardsStackParamList> | undefined;
};
