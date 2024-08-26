import convertLegacyProperties from './convertLegacyProperties';

describe('convertLegacyProperties', () => {
  it('processes empty input', () => {
    const result = convertLegacyProperties({});
    expect(result).toEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns the same object if input is already EventProperties', () => {
    const properties = {
      properties: { prop1: 'value1' },
      sensitiveProperties: { prop2: 'value2' },
    };
    const result = convertLegacyProperties(properties);
    expect(result).toEqual(properties);
  });

  it('processes EventProperties with legacy anonymous properties', () => {
    const properties = {
      properties: {
        prop1: 'value1',
        active_currency: { anonymous: true, value: 'FOXY' },
      },
      sensitiveProperties: { prop2: 'value2' },
    };
    const result = convertLegacyProperties(properties);
    expect(result).toEqual({
      properties: {
        prop1: 'value1',
      },
      sensitiveProperties: {
        active_currency: 'FOXY',
        prop2: 'value2',
      },
    });
  });

  it('processes non-object properties', () => {
    const properties = {
      prop1: 'value1',
      prop2: 123,
    };
    const result = convertLegacyProperties(properties);
    expect(result).toEqual({
      properties,
      sensitiveProperties: {},
    });
  });

  it('separates anonymous and non-anonymous object properties', () => {
    const properties = {
      account_type: 'Imported',
      active_currency: { anonymous: true, value: 'FOXY' },
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
    };
    const result = convertLegacyProperties(properties);
    expect(result).toEqual({
      properties: {
        account_type: 'Imported',
        chain_id: '59144',
        gas_estimate_type: 'fee-market',
        gas_mode: 'Basic',
        request_source: 'In-App-Browser',
        speed_set: 'medium',
      },
      sensitiveProperties: {
        active_currency: 'FOXY',
      },
    });
  });

  it('adds arrays to non-anonymous properties', () => {
    const properties = {
      arrayProp: [1, 2, 3],
    };
    const result = convertLegacyProperties(properties);
    expect(result).toEqual({
      properties,
      sensitiveProperties: {},
    });
  });

  it('handles mixed types', () => {
    const properties = {
      account_type: 'Imported',
      active_currency: { anonymous: true, value: 'FOXY' },
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
      arrayProp: ['a', 'b', 'c'],
    };
    const result = convertLegacyProperties(properties);
    expect(result).toEqual({
      properties: {
        account_type: 'Imported',
        chain_id: '59144',
        gas_estimate_type: 'fee-market',
        gas_mode: 'Basic',
        request_source: 'In-App-Browser',
        speed_set: 'medium',
        arrayProp: ['a', 'b', 'c'],
      },
      sensitiveProperties: {
        active_currency: 'FOXY',
      },
    });
  });
});
