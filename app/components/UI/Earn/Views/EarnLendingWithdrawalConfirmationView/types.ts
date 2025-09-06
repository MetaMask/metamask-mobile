import { TokenI } from '../../../Tokens/types';
import { EarnTokenDetails } from '../../types/lending.types';
import { SimulatedAaveV3HealthFactorAfterWithdrawal } from '../../utils/tempLending';

export interface EarnWithdrawalConfirmationViewRouteParams {
  token: TokenI | EarnTokenDetails;
  amountTokenMinimalUnit: string;
  amountFiat: string;
  lendingProtocol: string;
  lendingContractAddress: string;
  healthFactorSimulation: SimulatedAaveV3HealthFactorAfterWithdrawal;
}
