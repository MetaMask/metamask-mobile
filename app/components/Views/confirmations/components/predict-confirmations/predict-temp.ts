import { RootState } from '../../../../../reducers';
import Images from '../../../../../images/image-icons';
import { Hex } from '@metamask/utils';

export interface PredictClaimData {
  winningsFiat: number;
  changeFiat: number;
  marketIds: string[];
}

export const selectPredictClaimDataByTransactionId = (
  _state: RootState,
  _transactionId: string,
): PredictClaimData | undefined => ({
  winningsFiat: 229.09,
  changeFiat: 46.35,
  marketIds: ['test-1', 'test-2', 'test-3', 'test-4', 'test-5'],
});

export const selectPredictBalanceByAddress = (
  _state: RootState,
  _address: Hex,
) => 1232.39;

export function getPredictMarketImage(_marketId: string) {
  return Images.BTC;
}
