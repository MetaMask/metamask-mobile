import { selectExploreSectionsOrder } from '.';

describe('selectExploreSectionsOrder', () => {
  const validConfig = {
    home: ['predictions', 'tokens', 'perps', 'stocks', 'sites'],
    quickActions: ['tokens', 'perps', 'stocks', 'predictions', 'sites'],
    search: ['tokens', 'perps', 'stocks', 'predictions', 'sites'],
  };

  it('returns the config when all three arrays contain valid section IDs', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: validConfig,
    });

    expect(result).toEqual(validConfig);
  });

  it('returns a reordered config', () => {
    const reordered = {
      home: ['sites', 'stocks', 'tokens', 'perps', 'predictions'],
      quickActions: ['predictions', 'sites', 'tokens', 'stocks', 'perps'],
      search: ['perps', 'predictions', 'sites', 'tokens', 'stocks'],
    };
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: reordered,
    });

    expect(result).toEqual(reordered);
  });

  it('accepts partial section lists (not all IDs required)', () => {
    const partial = {
      home: ['tokens', 'sites'],
      quickActions: ['predictions'],
      search: ['perps', 'tokens'],
    };
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: partial,
    });

    expect(result).toEqual(partial);
  });

  it('returns null when the flag is absent', () => {
    const result = selectExploreSectionsOrder.resultFunc({});

    expect(result).toBeNull();
  });

  it('returns null when the flag is null', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: null,
    });

    expect(result).toBeNull();
  });

  it('returns null when the flag is a primitive', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: true,
    });

    expect(result).toBeNull();
  });

  it('returns null when home contains an invalid section ID', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: {
        ...validConfig,
        home: ['tokens', 'invalidSection'],
      },
    });

    expect(result).toBeNull();
  });

  it('returns null when quickActions is empty', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: { ...validConfig, quickActions: [] },
    });

    expect(result).toBeNull();
  });

  it('returns null when search is missing', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: {
        home: validConfig.home,
        quickActions: validConfig.quickActions,
      },
    });

    expect(result).toBeNull();
  });

  it('returns null when a field is not an array', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: { ...validConfig, search: 'tokens' },
    });

    expect(result).toBeNull();
  });

  it('returns null when an array contains duplicate IDs', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: {
        ...validConfig,
        home: ['tokens', 'tokens', 'sites'],
      },
    });

    expect(result).toBeNull();
  });

  it('unwraps a progressive rollout wrapper shape', () => {
    const result = selectExploreSectionsOrder.resultFunc({
      exploreSectionsOrder: {
        name: 'exploreSectionsOrder',
        value: validConfig,
      },
    });

    expect(result).toEqual(validConfig);
  });
});
