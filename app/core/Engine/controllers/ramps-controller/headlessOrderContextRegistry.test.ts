import {
  __resetHeadlessOrderContextRegistryForTests,
  deleteHeadlessOrderContext,
  getHeadlessOrderContext,
  setHeadlessOrderContext,
} from './headlessOrderContextRegistry';

describe('headlessOrderContextRegistry', () => {
  beforeEach(() => {
    __resetHeadlessOrderContextRegistryForTests();
  });

  it('stores and retrieves a context by order code', () => {
    setHeadlessOrderContext('abc-123', {
      rampSurface: 'perps',
      region: 'us-ca',
    });

    expect(getHeadlessOrderContext('abc-123')).toEqual({
      rampSurface: 'perps',
      region: 'us-ca',
    });
  });

  it('returns undefined for an unknown order', () => {
    expect(getHeadlessOrderContext('never-set')).toBeUndefined();
  });

  it('deletes a stored context', () => {
    setHeadlessOrderContext('abc-123', { region: 'fr' });
    deleteHeadlessOrderContext('abc-123');

    expect(getHeadlessOrderContext('abc-123')).toBeUndefined();
  });

  it('preserves an absent rampSurface (region-only context)', () => {
    setHeadlessOrderContext('abc-123', { region: 'gb' });

    expect(getHeadlessOrderContext('abc-123')).toEqual({ region: 'gb' });
  });

  describe('extractOrderCode normalization', () => {
    it('normalizes the key on set so a bare-code get matches a full-path set', () => {
      setHeadlessOrderContext('/providers/transak/orders/abc-123', {
        rampSurface: 'money_account',
        region: 'us-ca',
      });

      expect(getHeadlessOrderContext('abc-123')).toEqual({
        rampSurface: 'money_account',
        region: 'us-ca',
      });
    });

    it('normalizes the key on get so a full-path get matches a bare-code set', () => {
      setHeadlessOrderContext('abc-123', {
        rampSurface: 'prediction',
        region: 'de',
      });

      expect(
        getHeadlessOrderContext('/providers/transak/orders/abc-123'),
      ).toEqual({ rampSurface: 'prediction', region: 'de' });
    });

    it('normalizes the key on delete so a full-path delete removes a bare-code set', () => {
      setHeadlessOrderContext('abc-123', { region: 'us-ca' });
      deleteHeadlessOrderContext('/providers/transak/orders/abc-123');

      expect(getHeadlessOrderContext('abc-123')).toBeUndefined();
    });
  });

  it('reset clears all entries', () => {
    setHeadlessOrderContext('a', { region: 'us' });
    setHeadlessOrderContext('b', { region: 'fr' });

    __resetHeadlessOrderContextRegistryForTests();

    expect(getHeadlessOrderContext('a')).toBeUndefined();
    expect(getHeadlessOrderContext('b')).toBeUndefined();
  });
});
