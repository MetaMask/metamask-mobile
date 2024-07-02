import preProcessAnalyticsEvent from './preProcessAnalyticsEvent';

describe('preProcessAnalyticsEvent', () => {
  it('should correctly process empty input', () => {
    const [userParams, anonymousParams] = preProcessAnalyticsEvent({});
    expect(userParams).toEqual({});
    expect(anonymousParams).toEqual({});
  });

  it('should return empty objects for both userParams and anonymousParams when params is undefined', () => {
    // Simulate calling the function with undefined by casting undefined to any
    const [userParams, anonymousParams] = preProcessAnalyticsEvent(
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
    );

    expect(userParams).toEqual({});
    expect(anonymousParams).toEqual({});
  });

  it('should process non-object properties correctly', () => {
    const params = {
      prop1: 'value1',
      prop2: 123,
    };
    const [userParams, anonymousParams] = preProcessAnalyticsEvent(params);
    expect(userParams).toEqual(params);
    expect(anonymousParams).toEqual(params);
  });

  it('should separate anonymous and non-anonymous object properties', () => {
    const params = {
      account_type: 'Imported',
      active_currency: { anonymous: true, value: 'FOXY' },
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
    };
    const [userParams, anonymousParams] = preProcessAnalyticsEvent(params);
    expect(userParams).toEqual({
      account_type: 'Imported',
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
    });
    expect(anonymousParams).toEqual({
      account_type: 'Imported',
      active_currency: 'FOXY',
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
    });
  });

  it('should ignore arrays and add them to both user and anonymous params', () => {
    const params = {
      arrayProp: [1, 2, 3],
    };
    const [userParams, anonymousParams] = preProcessAnalyticsEvent(params);
    expect(userParams).toEqual(params);
    expect(anonymousParams).toEqual(params);
  });

  it('should handle mixed types of properties correctly', () => {
    const params = {
      account_type: 'Imported',
      active_currency: { anonymous: true, value: 'FOXY' },
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
      arrayProp: ['a', 'b', 'c'],
    };
    const [userParams, anonymousParams] = preProcessAnalyticsEvent(params);
    expect(userParams).toEqual({
      account_type: 'Imported',
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
      arrayProp: ['a', 'b', 'c'],
    });
    expect(anonymousParams).toEqual({
      account_type: 'Imported',
      active_currency: 'FOXY',
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
      arrayProp: ['a', 'b', 'c'],
    });
  });
});

/*

{"category": "Send Flow", "properties": {"action": "Send Flow", "name": "Adds Amount"}} {"network": "linea-mainnet"}
{"category": "Send Transaction Started"} {"account_type": "Imported", "active_currency": {"anonymous": true, "value": "FOXY"}, "chain_id": "59144", "gas_estimate_type": "fee-market", "gas_mode": "Basic", "request_source": "In-App-Browser", "speed_set": "medium"}

*/
