import { RootState } from '../../reducers';
import { RampsControllerState } from '@metamask/ramps-controller';
import { selectRampsControllerState, selectGeolocation } from './index';

describe('RampsController Selectors', () => {
  describe('selectRampsControllerState', () => {
    it('returns RampsController state from engine', () => {
      const mockRampsControllerState: RampsControllerState = {
        geolocation: 'US-CA',
      };

      const mockState = {
        engine: {
          backgroundState: {
            RampsController: mockRampsControllerState,
          },
        },
      } as unknown as RootState;

      expect(selectRampsControllerState(mockState)).toEqual(
        mockRampsControllerState,
      );
    });
  });

  describe('selectGeolocation', () => {
    it('returns geolocation from RampsController state', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: 'US-NY',
            },
          },
        },
      } as unknown as RootState;

      expect(selectGeolocation(mockState)).toBe('US-NY');
    });

    it('returns null if geolocation is null', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: {
              geolocation: null,
            },
          },
        },
      } as unknown as RootState;

      expect(selectGeolocation(mockState)).toBeNull();
    });

    it('returns null if RampsController state is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            RampsController: undefined,
          },
        },
      } as unknown as RootState;

      expect(selectGeolocation(mockState)).toBeNull();
    });
  });
});
