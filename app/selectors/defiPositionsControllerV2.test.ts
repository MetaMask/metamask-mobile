import { selectDeFiPositionsV2State } from './defiPositionsControllerV2';
import { RootState } from '../reducers';

describe('defiPositionsControllerV2 selectors', () => {
  describe('selectDeFiPositionsV2State', () => {
    it('returns allDeFiPositionsV2 from controller state', () => {
      const positions = {
        'account-id-1': [
          {
            protocolId: 'aave',
            chainId: 'eip155:1',
            productName: 'Aave',
            protocolIconUrl: 'https://example.com/aave.png',
            marketValue: 100,
            iconGroup: [],
            sections: [],
          },
        ],
      };

      const result = selectDeFiPositionsV2State({
        engine: {
          backgroundState: {
            DeFiPositionsControllerV2: {
              allDeFiPositionsV2: positions,
            },
          },
        },
      } as unknown as RootState);

      expect(result).toEqual(positions);
    });

    it('returns an empty object when controller state is missing', () => {
      const result = selectDeFiPositionsV2State({
        engine: {
          backgroundState: {},
        },
      } as unknown as RootState);

      expect(result).toEqual({});
    });
  });
});
