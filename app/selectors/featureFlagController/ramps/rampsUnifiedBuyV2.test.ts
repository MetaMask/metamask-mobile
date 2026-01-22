import {
  RampsUnifiedBuyV2Config,
  selectRampsUnifiedBuyV2Config,
  selectRampsUnifiedBuyV2ActiveFlag,
  selectRampsUnifiedBuyV2MinimumVersionFlag,
} from './rampsUnifiedBuyV2';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

describe('RampsUnifiedBuyV2 selectors', () => {
  const mockRemoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags> & {
    rampsUnifiedBuyV2: RampsUnifiedBuyV2Config;
  } = {
    rampsUnifiedBuyV2: {
      active: true,
      minimumVersion: '7.63.0',
    },
  };

  const mockEmptyRemoteFeatureFlags = {};

  describe('selectRampsUnifiedBuyV2Config', () => {
    it('returns the rampsUnifiedBuyV2Config when it exists', () => {
      const result = selectRampsUnifiedBuyV2Config.resultFunc(
        mockRemoteFeatureFlags,
      );

      expect(result).toEqual(mockRemoteFeatureFlags.rampsUnifiedBuyV2);
    });

    it('returns an empty object when rampsUnifiedBuyV2Config does not exist', () => {
      const result = selectRampsUnifiedBuyV2Config.resultFunc(
        mockEmptyRemoteFeatureFlags,
      );

      expect(result).toEqual({});
    });

    it('returns an empty object when remoteFeatureFlags is null', () => {
      const result = selectRampsUnifiedBuyV2Config.resultFunc(
        null as unknown as FeatureFlags,
      );

      expect(result).toEqual({});
    });

    it('returns an empty object when remoteFeatureFlags is undefined', () => {
      const result = selectRampsUnifiedBuyV2Config.resultFunc(
        undefined as unknown as FeatureFlags,
      );

      expect(result).toEqual({});
    });
  });

  describe('selectRampsUnifiedBuyV2ActiveFlag', () => {
    it('returns true when active is set to true', () => {
      const result = selectRampsUnifiedBuyV2ActiveFlag.resultFunc(
        mockRemoteFeatureFlags.rampsUnifiedBuyV2,
      );

      expect(result).toBe(true);
    });

    it('returns false when active is set to false', () => {
      const mockConfigWithActiveFalse: RampsUnifiedBuyV2Config = {
        active: false,
        minimumVersion: '7.63.0',
      };

      const result = selectRampsUnifiedBuyV2ActiveFlag.resultFunc(
        mockConfigWithActiveFalse,
      );

      expect(result).toBe(false);
    });

    it('returns false when active is not set', () => {
      const result = selectRampsUnifiedBuyV2ActiveFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when active is null', () => {
      const mockConfigWithActiveNull: RampsUnifiedBuyV2Config = {
        active: null as unknown as boolean,
        minimumVersion: '7.63.0',
      };

      const result = selectRampsUnifiedBuyV2ActiveFlag.resultFunc(
        mockConfigWithActiveNull,
      );

      expect(result).toBe(false);
    });

    it('returns false when active is undefined', () => {
      const mockConfigWithActiveUndefined: RampsUnifiedBuyV2Config = {
        active: undefined as unknown as boolean,
        minimumVersion: '7.63.0',
      };

      const result = selectRampsUnifiedBuyV2ActiveFlag.resultFunc(
        mockConfigWithActiveUndefined,
      );

      expect(result).toBe(false);
    });
  });

  describe('selectRampsUnifiedBuyV2MinimumVersionFlag', () => {
    it('returns the minimumVersion when it exists', () => {
      const result = selectRampsUnifiedBuyV2MinimumVersionFlag.resultFunc(
        mockRemoteFeatureFlags.rampsUnifiedBuyV2,
      );

      expect(result).toBe('7.63.0');
    });

    it('returns null when minimumVersion is not set', () => {
      const result = selectRampsUnifiedBuyV2MinimumVersionFlag.resultFunc({});

      expect(result).toBeNull();
    });

    it('returns null when minimumVersion is null', () => {
      const mockConfigWithVersionNull: RampsUnifiedBuyV2Config = {
        active: true,
        minimumVersion: null as unknown as string,
      };

      const result = selectRampsUnifiedBuyV2MinimumVersionFlag.resultFunc(
        mockConfigWithVersionNull,
      );

      expect(result).toBeNull();
    });

    it('returns null when minimumVersion is undefined', () => {
      const mockConfigWithVersionUndefined: RampsUnifiedBuyV2Config = {
        active: true,
        minimumVersion: undefined,
      };

      const result = selectRampsUnifiedBuyV2MinimumVersionFlag.resultFunc(
        mockConfigWithVersionUndefined,
      );

      expect(result).toBeNull();
    });

    it('returns the minimumVersion when it is an empty string', () => {
      const mockConfigWithEmptyVersion: RampsUnifiedBuyV2Config = {
        active: true,
        minimumVersion: '',
      };

      const result = selectRampsUnifiedBuyV2MinimumVersionFlag.resultFunc(
        mockConfigWithEmptyVersion,
      );

      expect(result).toBe('');
    });
  });
});
