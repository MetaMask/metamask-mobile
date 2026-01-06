import { RootState } from '../../reducers';
import { selectPerpsControllerState } from './base';

describe('Perps Base Selectors', () => {
  describe('selectPerpsControllerState', () => {
    it('returns PerpsController state from engine backgroundState', () => {
      const mockPerpsControllerState = {
        withdrawalRequests: [],
        someOtherProperty: 'value',
      };
      const mockState = {
        engine: {
          backgroundState: {
            PerpsController: mockPerpsControllerState,
          },
        },
      } as unknown as RootState;

      const result = selectPerpsControllerState(mockState);

      expect(result).toEqual(mockPerpsControllerState);
    });

    it('returns undefined when PerpsController is not present', () => {
      const mockState = {
        engine: {
          backgroundState: {},
        },
      } as unknown as RootState;

      const result = selectPerpsControllerState(mockState);

      expect(result).toBeUndefined();
    });

    it('returns undefined when backgroundState is undefined', () => {
      const mockState = {
        engine: {},
      } as unknown as RootState;

      const result = selectPerpsControllerState(mockState);

      expect(result).toBeUndefined();
    });

    it('returns undefined when engine is undefined', () => {
      const mockState = {} as unknown as RootState;

      const result = selectPerpsControllerState(mockState);

      expect(result).toBeUndefined();
    });
  });
});
