import type { ReactNode } from 'react';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import type { AccountGroupId } from '@metamask/account-api';
import type { SeasonRewardType } from '../../../../core/Engine/controllers/rewards-controller/types';
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

export interface RewardsModalAction {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  disabled?: boolean;
  isLoading?: boolean;
  loadOnPress?: boolean;
}

/** Params for `RewardsBottomSheetModal` (root modal). */
export interface RewardsBottomSheetModalParams {
  title: string | ReactNode;
  description: string | ReactNode;
  type?: 'danger' | 'confirmation';
  confirmAction: RewardsModalAction;
  onCancel?: () => void;
  cancelLabel?: string;
  showCancelButton?: boolean;
  cancelMode?: 'cta-button' | 'top-right-cross-icon' | string;
  showIcon?: boolean;
  customIcon?: ReactNode;
}

/**
 * Params for `RewardsClaimBottomSheetModal`.
 * `rewardId` is optional because some call sites pass `reward?.id`.
 */
export interface RewardsClaimBottomSheetModalParams {
  rewardId?: string;
  seasonRewardId: string;
  rewardType: SeasonRewardType;
  claimUrl?: string;
  isLocked: boolean;
  hasClaimed: boolean;
  title: string;
  icon: IconName;
  description: string;
  showInput?: boolean;
  inputPlaceholder?: string;
}

export type RewardsInputFieldConfig = 'required' | 'optional' | false;

/** Params for `EndOfSeasonClaimBottomSheet`. */
export interface EndOfSeasonClaimBottomSheetParams {
  seasonRewardId: string;
  url?: string;
  title: string;
  description?: string;
  contactInfo?: string;
  rewardType: SeasonRewardType;
  showAccount?: boolean;
  showEmail?: RewardsInputFieldConfig;
  showTelegram?: RewardsInputFieldConfig;
  rewardId?: string;
}

/**
 * Params for `RewardOptInAccountGroupModal`.
 * `accountGroupId` may be undefined when the group is still loading.
 */
export interface RewardOptInAccountGroupModalParams {
  accountGroupId?: AccountGroupId;
  addressData: {
    address: string;
    hasOptedIn: boolean;
    scopes: string[];
    isSupported?: boolean;
  }[];
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
  RewardsBottomSheetModal: RewardsBottomSheetModalParams | undefined;
  RewardsClaimBottomSheetModal: RewardsClaimBottomSheetModalParams | undefined;
  RewardOptInAccountGroupModal: RewardOptInAccountGroupModalParams | undefined;
  EndOfSeasonClaimBottomSheet: EndOfSeasonClaimBottomSheetParams | undefined;
};
