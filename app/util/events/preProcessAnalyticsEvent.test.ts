import { JsonMap } from '@segment/analytics-react-native';
import preProcessAnalyticsEvent from './preProcessAnalyticsEvent';

describe('preProcessAnalyticsEvent', () => {
  it('processes empty input', () => {
    const [nonAnonymousProperties, anonymousProperties] =
      preProcessAnalyticsEvent({});
    expect(nonAnonymousProperties).toEqual({});
    expect(anonymousProperties).toEqual({});
  });

  it('returns empty objects for both nonAnonymousProperties and anonymousProperties when properties is undefined', () => {
    // Simulate calling the function with undefined by casting undefined to any
    const [nonAnonymousProperties, anonymousProperties] =
      preProcessAnalyticsEvent(undefined as unknown as JsonMap);

    expect(nonAnonymousProperties).toEqual({});
    expect(anonymousProperties).toEqual({});
  });

  it('processes non-object properties', () => {
    const properties = {
      prop1: 'value1',
      prop2: 123,
    };
    const [nonAnonymousProperties] = preProcessAnalyticsEvent(properties);
    expect(nonAnonymousProperties).toEqual(properties);
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
    const [nonAnonymousProperties, anonymousProperties] =
      preProcessAnalyticsEvent(properties);
    expect(nonAnonymousProperties).toEqual({
      account_type: 'Imported',
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
    });
    expect(anonymousProperties).toEqual({
      active_currency: 'FOXY',
    });
  });

  it('ignores arrays and add them to non-anonymous properties', () => {
    const properties = {
      arrayProp: [1, 2, 3],
    };
    const [nonAnonymousProperties] = preProcessAnalyticsEvent(properties);
    expect(nonAnonymousProperties).toEqual(properties);
  });

  it('handles mixed types of properties', () => {
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
    const [nonAnonymousProperties, anonymousProperties] =
      preProcessAnalyticsEvent(properties);
    expect(nonAnonymousProperties).toEqual({
      account_type: 'Imported',
      chain_id: '59144',
      gas_estimate_type: 'fee-market',
      gas_mode: 'Basic',
      request_source: 'In-App-Browser',
      speed_set: 'medium',
      arrayProp: ['a', 'b', 'c'],
    });
    expect(anonymousProperties).toEqual({
      active_currency: 'FOXY',
    });
  });

  it('adds non-anonymous object properties without anonymous key to nonAnonymousProperties', () => {
    const properties = {
      non_anonymous_object: { value: 'testValue' },
    };
    const [nonAnonymousProperties, anonymousProperties] =
      preProcessAnalyticsEvent(properties);
    expect(nonAnonymousProperties).toEqual({
      non_anonymous_object: 'testValue',
    });
    expect(anonymousProperties).toEqual({});
  });
});
