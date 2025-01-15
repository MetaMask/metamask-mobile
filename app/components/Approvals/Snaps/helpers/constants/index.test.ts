import { DelineatorType, getDelineatorTitle } from './index';

describe('Delineator Constants', () => {
  describe('DelineatorType enum', () => {
    it('should have the correct values', () => {
      expect(DelineatorType.Content).toBe('content');
      expect(DelineatorType.Error).toBe('error');
      expect(DelineatorType.Insights).toBe('insights');
      expect(DelineatorType.Description).toBe('description');
      expect(DelineatorType.Warning).toBe('warning');
    });
  });

  describe('getDelineatorTitle', () => {
    it('should return correct title for Error type', () => {
      expect(getDelineatorTitle(DelineatorType.Error)).toBe('errorWithSnap');
    });

    it('should return correct title for Insights type', () => {
      expect(getDelineatorTitle(DelineatorType.Insights)).toBe(
        'insightsFromSnap',
      );
    });

    it('should return correct title for Description type', () => {
      expect(getDelineatorTitle(DelineatorType.Description)).toBe(
        'descriptionFromSnap',
      );
    });

    it('should return correct title for Warning type', () => {
      expect(getDelineatorTitle(DelineatorType.Warning)).toBe(
        'warningFromSnap',
      );
    });

    it('should return default title for Content type', () => {
      expect(getDelineatorTitle(DelineatorType.Content)).toBe(
        'contentFromSnap',
      );
    });

    it('should return default title for unknown type', () => {
      expect(getDelineatorTitle('unknown' as DelineatorType)).toBe(
        'contentFromSnap',
      );
    });
  });
});
