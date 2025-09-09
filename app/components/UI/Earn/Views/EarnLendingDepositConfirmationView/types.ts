import { TokenI } from '../../../Tokens/types';
import { EARN_LENDING_ACTIONS } from '../../types/lending.types';

export interface LendingDepositViewRouteParams {
  token?: TokenI;
  amountTokenMinimalUnit?: string;
  amountFiat?: string;
  annualRewardsToken?: string;
  annualRewardsFiat?: string;
  annualRewardRate?: string;
  action?: Extract<EARN_LENDING_ACTIONS, 'ALLOWANCE_INCREASE' | 'DEPOSIT'>;
  lendingContractAddress?: string;
  lendingProtocol?: string;
  networkName?: string;
  allowanceMinimalTokenUnit?: string;
}
