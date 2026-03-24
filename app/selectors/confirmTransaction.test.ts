import { RootState } from '../reducers';
import { selectGasFeeEstimates } from './confirmTransaction';

const GAS_FEE_ESTIMATES_MOCK = { low: '1', medium: '2', high: '3' };

describe('Confirm Transaction Selectors', () => {
  describe('selectGasFeeEstimates', () => {
    it('returns GasFeeController estimates', () => {
      const state = {
        engine: {
          backgroundState: {
            GasFeeController: { gasFeeEstimates: GAS_FEE_ESTIMATES_MOCK },
          },
        },
      };

      expect(
        selectGasFeeEstimates(state as unknown as RootState),
      ).toStrictEqual(GAS_FEE_ESTIMATES_MOCK);
    });
  });
});
