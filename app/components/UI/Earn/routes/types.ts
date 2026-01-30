import type { EarnTokenDetails } from '../types/lending.types';

/**
 * Param list for the Earn screen stack navigator.
 */
export interface EarnScreenParamList {
  EarnLendingDepositConfirmation: undefined;
  EarnLendingWithdrawalConfirmation: undefined;
  RedesignedConfirmations:
    | { amountWei: string; amountFiat: string }
    | undefined;
  EarnMusdConversionEducation: undefined;
}

/**
 * Param list for the Earn modal stack navigator.
 */
export interface EarnModalParamList {
  EarnLendingMaxWithdrawalModal: undefined;
  EarnLendingLearnMoreModal: { asset: EarnTokenDetails };
}

/**
 * Combined param list for all Earn-related navigation.
 */
export type EarnParamList = EarnScreenParamList & EarnModalParamList;
