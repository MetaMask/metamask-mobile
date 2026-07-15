import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import { PredictHotTabFlag, PredictLiveSportsFlag } from '../types/flags';
import { unwrapRemoteFeatureFlag } from './flags';

describe('unwrapRemoteFeatureFlag', () => {
  describe('direct shape (flag is the object itself)', () => {
    it('returns the flag object for a version-gated flag', () => {
      const flag = { enabled: true, minimumVersion: '7.65.0' };

      const result = unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(flag);

      expect(result).toEqual(flag);
    });

    it('returns the flag object with extra properties intact', () => {
      const flag: PredictHotTabFlag = {
        enabled: true,
        minimumVersion: '7.64.0',
        queryParams: 'tag_id=149&order=volume24hr',
      };

      const result = unwrapRemoteFeatureFlag<PredictHotTabFlag>(flag);

      expect(result).toEqual(flag);
      expect(result?.queryParams).toBe('tag_id=149&order=volume24hr');
    });

    it('returns non-version-gated flag objects unchanged', () => {
      const flag: PredictLiveSportsFlag = {
        enabled: true,
        leagues: ['soccer_epl', 'soccer_laliga'],
      };

      const result = unwrapRemoteFeatureFlag<PredictLiveSportsFlag>(flag);

      expect(result).toEqual(flag);
      expect(result?.leagues).toEqual(['soccer_epl', 'soccer_laliga']);
    });
  });

  describe('progressive rollout shape ({ name, value })', () => {
    it('extracts .value from a wrapped version-gated flag', () => {
      const input = {
        name: 'group-a',
        value: { enabled: true, minimumVersion: '7.65.0' },
      };

      const result = unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(input);

      expect(result).toEqual({ enabled: true, minimumVersion: '7.65.0' });
    });

    it('extracts .value preserving extra flag properties', () => {
      const input = {
        name: 'exp-1',
        value: {
          enabled: true,
          minimumVersion: '0.0.0',
          queryParams: 'tag_id=149',
        },
      };

      const result = unwrapRemoteFeatureFlag<PredictHotTabFlag>(input);

      expect(result?.queryParams).toBe('tag_id=149');
      expect(result?.enabled).toBe(true);
    });

    it('extracts .value when name property is absent', () => {
      const input = {
        value: { enabled: true, minimumVersion: '1.0.0' },
      };

      const result = unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(input);

      expect(result).toEqual({ enabled: true, minimumVersion: '1.0.0' });
    });
  });

  describe('returns undefined for non-object inputs', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['string', 'some-string'],
      ['number', 42],
      ['boolean', true],
    ] as const)('returns undefined for %s', (_label, input) => {
      const result = unwrapRemoteFeatureFlag(input);

      expect(result).toBeUndefined();
    });
  });

  describe('returns undefined for wrapped shape with non-object .value', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['string', 'not-an-object'],
      ['number', 42],
      ['boolean', false],
    ] as const)('returns undefined when .value is %s', (_label, value) => {
      const input = { value };

      const result = unwrapRemoteFeatureFlag(input);

      expect(result).toBeUndefined();
    });
  });

  describe('enabled property takes precedence over value property', () => {
    it('treats flag as direct shape when both enabled and value are present', () => {
      const input = {
        enabled: true,
        minimumVersion: '1.0.0',
        value: { enabled: false, minimumVersion: '2.0.0' },
      };

      const result = unwrapRemoteFeatureFlag<VersionGatedFeatureFlag>(input);

      expect(result).toEqual(input);
    });

    it('returns the full direct flag even when it has a value property', () => {
      const input = { enabled: true, value: 42, customProp: 'test' };

      const result = unwrapRemoteFeatureFlag<Record<string, unknown>>(input);

      expect(result).toEqual(input);
      expect(result?.value).toBe(42);
    });
  });
});
