import type { ConfirmationParams } from '../../../Views/confirmations/components/confirm/confirm-component';
import type { TokenI } from '../../Tokens/types';

// Superset of ConfirmationParams; staking/claim also forward amountWei/amountFiat.
export type StakeRedesignedConfirmationsParams =
  | (ConfirmationParams & { amountWei?: string; amountFiat?: string })
  | undefined;

// `StakeScreens` native stack.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type StakeScreensStackParamList = {
  Stake: { token?: TokenI } | undefined;
  Unstake: { token?: TokenI } | undefined;
  EarningsHistory: { asset: TokenI };
  RedesignedConfirmations: StakeRedesignedConfirmationsParams;
};

/** Earn token list sheet params (WalletActions / StakeModals). */
export interface EarnTokenListParams {
  tokenFilter: {
    includeReceiptTokens: boolean;
    includeNativeTokens?: boolean;
    includeStakingTokens?: boolean;
    includeLendingTokens?: boolean;
  };
  onItemPressScreen: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type StakeModalsNavigationParamList = {
  LearnMore: { chainId?: string } | undefined;
  TrxLearnMore: undefined;
  MaxInput: { handleMaxPress: () => void } | undefined;
  GasImpact:
    | {
        amountWei?: string;
        amountFiat?: string;
        annualRewardsETH?: string;
        annualRewardsToken?: string;
        annualRewardsFiat?: string;
        annualRewardRate?: string;
        estimatedGasFee?: string;
        estimatedGasFeePercentage?: string;
        chainId?: string;
      }
    | undefined;
  EarnTokenList: EarnTokenListParams | undefined;
};
