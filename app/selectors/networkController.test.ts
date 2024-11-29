import { selectIsEIP1559Network } from './networkController';
import { RootState } from '../reducers';

const mockSelectedNetworkClientId = '1';

describe('NetworkController Selectors', () => {
  describe('selectIsEIP1559Network', () => {
    it('returns the isEIP1559Network from NetworkController state', () => {
      const isEIP1559Network = true;

      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: mockSelectedNetworkClientId,
              networksMetadata: {
                [mockSelectedNetworkClientId]: {
                  EIPS: { 1559: isEIP1559Network },
                },
              },
            },
          },
        },
      };

      expect(selectIsEIP1559Network(state as unknown as RootState)).toEqual(
        true,
      );
    });
  });
});
