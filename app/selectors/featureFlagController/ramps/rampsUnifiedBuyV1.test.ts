import {
  RampsUnifiedBuyV1Config,
  selectRampsUnifiedBuyV1Config,
  selectRampsUnifiedBuyV1ActiveFlag,
  selectRampsUnifiedBuyV1MinimumVersionFlag,
} from './rampsUnifiedBuyV1';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

describe('RampsUnifiedBuyV1 selectors', () => {
  const mockRemoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags> & {
    rampsUnifiedBuyV1: RampsUnifiedBuyV1Config;
  } = {
    rampsUnifiedBuyV1: {
      active: true,
      minimumVersion: '2.0.0',
    },
  };

  const mockEmptyRemoteFeatureFlags = {};

  describe('selectRampsUnifiedBuyV1Config', () => {
    it('returns the rampsUnifiedBuyV1Config when it exists', () => {
      const result = selectRampsUnifiedBuyV1Config.resultFunc(
        mockRemoteFeatureFlags,
      );
      expect(result).toEqual(mockRemoteFeatureFlags.rampsUnifiedBuyV1);
    });

    it('returns an empty object when rampsUnifiedBuyV1Config does not exist', () => {
      const result = selectRampsUnifiedBuyV1Config.resultFunc(
        mockEmptyRemoteFeatureFlags,
      );
      expect(result).toEqual({});
    });

    it('returns an empty object when remoteFeatureFlags is null', () => {
      const result = selectRampsUnifiedBuyV1Config.resultFunc(
        null as unknown as FeatureFlags,
      );
      expect(result).toEqual({});
    });

    it('returns an empty object when remoteFeatureFlags is undefined', () => {
      const result = selectRampsUnifiedBuyV1Config.resultFunc(
        undefined as unknown as FeatureFlags,
      );
      expect(result).toEqual({});
    });
  });

  describe('selectRampsUnifiedBuyV1ActiveFlag', () => {
    it('returns true when active is set to true', () => {
      const result = selectRampsUnifiedBuyV1ActiveFlag.resultFunc(
        mockRemoteFeatureFlags.rampsUnifiedBuyV1,
      );
      expect(result).toBe(true);
    });

    it('returns false when active is set to false', () => {
      const mockConfigWithActiveFalse: RampsUnifiedBuyV1Config = {
        active: false,
        minimumVersion: '2.0.0',
      };
      const result = selectRampsUnifiedBuyV1ActiveFlag.resultFunc(
        mockConfigWithActiveFalse,
      );
      expect(result).toBe(false);
    });

    it('returns false when active is not set', () => {
      const result = selectRampsUnifiedBuyV1ActiveFlag.resultFunc({});
      expect(result).toBe(false);
    });

    it('returns false when active is null', () => {
      const mockConfigWithActiveNull: RampsUnifiedBuyV1Config = {
        active: null as unknown as boolean,
        minimumVersion: '2.0.0',
      };
      const result = selectRampsUnifiedBuyV1ActiveFlag.resultFunc(
        mockConfigWithActiveNull,
      );
      expect(result).toBe(false);
    });

    it('returns false when active is undefined', () => {
      const mockConfigWithActiveUndefined: RampsUnifiedBuyV1Config = {
        active: undefined as unknown as boolean,
        minimumVersion: '2.0.0',
      };
      const result = selectRampsUnifiedBuyV1ActiveFlag.resultFunc(
        mockConfigWithActiveUndefined,
      );
      expect(result).toBe(false);
    });
  });

  describe('selectRampsUnifiedBuyV1MinimumVersionFlag', () => {
    it('returns the minimumVersion when it exists', () => {
      const result = selectRampsUnifiedBuyV1MinimumVersionFlag.resultFunc(
        mockRemoteFeatureFlags.rampsUnifiedBuyV1,
      );
      expect(result).toBe('2.0.0');
    });

    it('returns null when minimumVersion is not set', () => {
      const result = selectRampsUnifiedBuyV1MinimumVersionFlag.resultFunc({});
      expect(result).toBeNull();
    });

    it('returns null when minimumVersion is null', () => {
      const mockConfigWithVersionNull: RampsUnifiedBuyV1Config = {
        active: true,
        minimumVersion: null as unknown as string,
      };
      const result = selectRampsUnifiedBuyV1MinimumVersionFlag.resultFunc(
        mockConfigWithVersionNull,
      );
      expect(result).toBeNull();
    });

    it('returns null when minimumVersion is undefined', () => {
      const mockConfigWithVersionUndefined: RampsUnifiedBuyV1Config = {
        active: true,
        minimumVersion: undefined,
      };
      const result = selectRampsUnifiedBuyV1MinimumVersionFlag.resultFunc(
        mockConfigWithVersionUndefined,
      );
      expect(result).toBeNull();
    });

    it('returns the minimumVersion when it is an empty string', () => {
      const mockConfigWithEmptyVersion: RampsUnifiedBuyV1Config = {
        active: true,
        minimumVersion: '',
      };
      const result = selectRampsUnifiedBuyV1MinimumVersionFlag.resultFunc(
        mockConfigWithEmptyVersion,
      );
      expect(result).toBe('');
    });
  });
});
