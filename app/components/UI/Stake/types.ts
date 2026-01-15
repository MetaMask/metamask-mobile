import { ParamListBase } from '@react-navigation/native';

// Route params for each screen
export interface StakeConfirmationViewRouteParams {
  amountWei: string;
  amountFiat: string;
  annualRewardsETH: string;
  annualRewardsFiat: string;
  annualRewardRate: string;
  chainId: string;
}

export interface UnstakeConfirmationViewRouteParams {
  amountWei: string;
  amountFiat: string;
}

export interface GasImpactModalRouteParams {
  amountWei: string;
  amountFiat: string;
  annualRewardsETH: string;
  annualRewardsFiat: string;
  annualRewardRate: string;
  estimatedGasFee: string;
  estimatedGasFeePercentage: string;
  chainId: string;
}

export interface MaxInputModalRouteParams {
  handleMaxPress?: () => void;
}

// Stack param list for StakeScreenStack - matches Routes.STAKING values
export interface StakeScreensParamList extends ParamListBase {
  Stake: undefined;
  Unstake: undefined;
  StakeConfirmation: StakeConfirmationViewRouteParams;
  UnstakeConfirmation: UnstakeConfirmationViewRouteParams;
  EarningsHistory: undefined;
  RedesignedConfirmations: undefined;
}

// Stack param list for StakeModalStack - matches Routes.STAKING.MODALS values
export interface StakeModalsParamList extends ParamListBase {
  LearnMore: undefined;
  MaxInput: MaxInputModalRouteParams;
  GasImpact: GasImpactModalRouteParams;
  EarnTokenList: undefined;
}

// Legacy type for backward compatibility
export interface StakeNavigationParamsList extends ParamListBase {
  StakeModals: {
    screen: string;
    params?: {
      amountWei?: string;
      amountFiat?: string;
      annualRewardsETH?: string;
      annualRewardsFiat?: string;
      annualRewardRate?: string;
      estimatedGasFee?: string;
      estimatedGasFeePercentage?: string;
      handleMaxPress?: () => void;
    };
  };
  StakeScreens: {
    screen: string;
    params?: {
      amountWei: string;
      amountFiat: string;
      annualRewardsETH?: string;
      annualRewardsFiat?: string;
      annualRewardRate?: string;
      chainId?: string;
    };
  };
}
