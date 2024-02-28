import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import {
  selectGasFeeControllerEstimateType,
  selectGasFeeControllerEstimates,
} from './gasFeeController';
import { RootState } from '../reducers';

describe('GasFeeController Selectors', () => {
  describe('selectGasFeeControllerEstimates', () => {
    it('returns the gas estimate type from GasFeeController state', () => {
      const gasFeeEstimates = { low: '1', medium: '2', high: '3' };

      const state = {
        engine: {
          backgroundState: {
            GasFeeController: {
              gasFeeEstimates,
            },
          },
        },
      };

      expect(
        selectGasFeeControllerEstimates(state as unknown as RootState),
      ).toStrictEqual(gasFeeEstimates);
    });
  });

  describe('selectGasFeeControllerEstimateType', () => {
    it('returns the gas estimate type from GasFeeController state', () => {
      const gasEstimateType = GAS_ESTIMATE_TYPES.FEE_MARKET;

      const state = {
        engine: {
          backgroundState: {
            GasFeeController: {
              gasEstimateType,
            },
          },
        },
      };

      expect(
        selectGasFeeControllerEstimateType(state as RootState),
      ).toStrictEqual(gasEstimateType);
    });
  });
});
