import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ConfirmationParams } from '../../../Views/confirmations/components/confirm/confirm-component';
import type { TokenI } from '../../Tokens/types';

// Superset of ConfirmationParams; staking/claim also forward amountWei/amountFiat.
export type StakeRedesignedConfirmationsParams =
  | (ConfirmationParams & { amountWei?: string; amountFiat?: string })
  | undefined;

// `StakeScreens` native stack. Reward/chain fields are lenient supersets: Earn
// passes `annualRewardsToken`, Stake reads `annualRewardsETH`; kept optional to
// model current payloads without runtime changes.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type StakeScreensStackParamList = {
  Stake: { token?: TokenI } | undefined;
  Unstake: { token?: TokenI } | undefined;
  StakeConfirmation:
    | {
        amountWei?: string;
        amountFiat?: string;
        annualRewardsETH?: string;
        annualRewardsToken?: string;
        annualRewardsFiat?: string;
        annualRewardRate?: string;
        chainId?: string;
      }
    | undefined;
  UnstakeConfirmation: { amountWei?: string; amountFiat?: string } | undefined;
  EarningsHistory: { asset: TokenI };
  RedesignedConfirmations: StakeRedesignedConfirmationsParams;
};

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
  EarnTokenList:
    | {
        tokenFilter: { includeReceiptTokens: boolean };
        onItemPressScreen: string;
      }
    | undefined;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type StakeNavigationParamList = StakeScreensStackParamList &
  StakeModalsNavigationParamList & {
    StakeScreens: NavigatorScreenParams<StakeScreensStackParamList> | undefined;
    StakeModals:
      | NavigatorScreenParams<StakeModalsNavigationParamList>
      | undefined;
  };
