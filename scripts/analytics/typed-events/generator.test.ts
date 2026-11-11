import type { ContractRule, JsonObject } from './contract';
import { generateEventPilot } from './generator';
import {
  QUICK_BUY_AMOUNT_SELECTED_PILOT,
  type EventPilotDefinition,
} from './quick-buy-pilot';

const property = (
  type: 'integer' | 'number' | 'string',
  enumValues?: readonly (number | string)[],
): JsonObject => ({
  type: [type],
  ...(enumValues ? { enum: enumValues } : {}),
});

const V1_PROPERTIES: JsonObject = {
  amount_selection_method: property('string', ['preset', 'custom_input']),
  amount_usd: property('number'),
  caip19: property('string'),
  pay_with_token: property('string'),
  preset_value: property('integer', [20, 50, 100, 250]),
  source: property('string', ['leaderboard']),
  trader_address: property('string'),
};

const V2_PROPERTIES: JsonObject = {
  ...V1_PROPERTIES,
  amount_selection_method: property('string', [
    'preset',
    'custom_input',
    'slider',
  ]),
  chain_name: property('string'),
  original_entry_point: property('string', ['leaderboard']),
  perps_market: property('string'),
  preset_value: property('integer', [10, 50, 100, 250]),
  slider_percent: property('integer'),
};

const createRule = (
  version: number,
  properties: JsonObject,
): ContractRule => ({
  key: 'Quick Buy Amount Selected',
  type: 'TRACK',
  version,
  jsonSchema: {
    type: 'object',
    properties: {
      properties: {
        type: 'object',
        properties,
        required: ['amount_usd', 'amount_selection_method', 'source'],
      },
    },
  },
  deprecatedAt: null,
});

const createRules = (): readonly ContractRule[] => [
  createRule(1, V1_PROPERTIES),
  createRule(2, V2_PROPERTIES),
];

describe('generateEventPilot', () => {
  it('generates distinct exact v1 and v2 APIs with version context', () => {
    const rules = createRules();

    const result = generateEventPilot(
      rules,
      QUICK_BUY_AMOUNT_SELECTED_PILOT,
    );

    expect(result.source).toContain(
      'export interface QuickBuyAmountSelectedV1Properties',
    );
    expect(result.source).toContain(
      'export interface QuickBuyAmountSelectedV2Properties',
    );
    expect(result.source).toContain(
      'readonly amount_selection_method: "preset" | "custom_input";',
    );
    expect(result.source).toContain(
      'readonly amount_selection_method: "preset" | "custom_input" | "slider";',
    );
    expect(result.source).toContain(
      'Record<Exclude<keyof Actual, keyof Expected>, never>',
    );
    expect(result.source).toContain('event_version: version');
    expect(result.source).toContain(
      'v2: createEventVersion<\n      QuickBuyAmountSelectedV2Properties',
    );
  });

  it('generates compile-fail checks for required, unknown, enum, and version errors', () => {
    const rules = createRules();

    const result = generateEventPilot(
      rules,
      QUICK_BUY_AMOUNT_SELECTED_PILOT,
    );

    expect(result.typeTests).toContain(
      '@ts-expect-error source is required',
    );
    expect(result.typeTests).toContain(
      '@ts-expect-error unknown properties are rejected',
    );
    expect(result.typeTests).toContain(
      '@ts-expect-error slider is not a v1 amount selection method',
    );
    expect(result.typeTests).toContain(
      '@ts-expect-error only generated versions are available',
    );
  });

  it('rejects a required contract property omitted by the pilot allowlist', () => {
    const rules = createRules();
    const pilot: EventPilotDefinition = {
      ...QUICK_BUY_AMOUNT_SELECTED_PILOT,
      versions: QUICK_BUY_AMOUNT_SELECTED_PILOT.versions.map((definition) =>
        definition.version === 2
          ? {
              ...definition,
              properties: definition.properties.filter(
                (name) => name !== 'source',
              ),
            }
          : definition,
      ),
    };

    expect(() => generateEventPilot(rules, pilot)).toThrow(
      'allowlist omits required v2 properties: source',
    );
  });

  it('rejects a pilot property missing from the deployed version', () => {
    const rules = [
      createRule(1, V1_PROPERTIES),
      createRule(2, {
        ...V2_PROPERTIES,
        slider_percent: undefined,
      } as unknown as JsonObject),
    ];

    expect(() =>
      generateEventPilot(rules, QUICK_BUY_AMOUNT_SELECTED_PILOT),
    ).toThrow('Expected object at rule v2.properties.slider_percent');
  });

  it('rejects schema constraints the narrow generator does not implement', () => {
    const rules = [
      createRule(1, V1_PROPERTIES),
      createRule(2, {
        ...V2_PROPERTIES,
        slider_percent: {
          type: ['integer'],
          minimum: 0,
        },
      }),
    ];

    expect(() =>
      generateEventPilot(rules, QUICK_BUY_AMOUNT_SELECTED_PILOT),
    ).toThrow('Unsupported JSON Schema keys');
  });
});
