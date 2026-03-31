// TODO: remove this test comment (codeowners-comment workflow test)
import { ParamListBase } from '@react-navigation/native';

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
