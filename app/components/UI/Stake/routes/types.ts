import type { Hex } from '@metamask/utils';
import type { TokenI } from '../../../Tokens/types';
import type { StakeConfirmationViewRouteParams } from '../Views/StakeConfirmationView/StakeConfirmationView.types';
import type { UnstakeConfirmationViewRouteParams } from '../Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import type { GasImpactModalRouteParams } from '../components/GasImpactModal/GasImpactModal.types';

/**
 * Param list for the Stake screen stack navigator.
 * This defines the route params for all screens in the StakeScreenStack.
 */
export interface StakeScreenParamList {
  Stake: undefined;
  Unstake: undefined;
  StakeConfirmation: StakeConfirmationViewRouteParams;
  UnstakeConfirmation: UnstakeConfirmationViewRouteParams;
  EarningsHistory: { asset: TokenI };
  RedesignedConfirmations:
    | { amountWei: string; amountFiat: string }
    | undefined;
}

/**
 * Param list for the Stake modal stack navigator.
 * This defines the route params for all modals in the StakeModalStack.
 */
export interface StakeModalParamList {
  LearnMore: { chainId?: string | Hex };
  TrxLearnMore: undefined;
  MaxInput: { handleMaxPress: () => void };
  GasImpact: GasImpactModalRouteParams;
  EarnTokenList: {
    tokenFilter: {
      includeNativeTokens?: boolean;
      includeStakingTokens?: boolean;
      includeLendingTokens?: boolean;
      includeReceiptTokens?: boolean;
    };
    onItemPressScreen: string;
  };
}

/**
 * Combined param list for all Stake-related navigation.
 */
export type StakeParamList = StakeScreenParamList & StakeModalParamList;
