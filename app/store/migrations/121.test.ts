import { cloneDeep } from 'lodash';
import migrate, { migrationVersion } from './121';

interface ValidStateShape {
  engine: { backgroundState: Record<string, unknown> };
}

type ValidState = ValidStateShape & {
  engine: { backgroundState: { TokensController?: unknown } };
};

const createValidState = (
  tokensController?: ValidStateShape['engine']['backgroundState']['TokensController'],
): ValidState => ({
  engine: {
    backgroundState: {
      ...(tokensController !== undefined && {
        TokensController: tokensController,
      }),
    },
  },
});

describe(`Migration ${migrationVersion}: Normalize TokensController decimals to numbers`, () => {
  const unchangedTestCases: {
    description: string;
    state: unknown;
  }[] = [
    {
      description: 'returns state unchanged if ensureValidState fails',
      state: 'not an object',
    },
    {
      description: 'returns state unchanged if state is empty object',
      state: {},
    },
    {
      description: 'returns state unchanged if TokensController is missing',
      state: createValidState(),
    },
    {
      description:
        'returns state unchanged if TokensController is not an object',
      state: createValidState('invalid'),
    },
    {
      description: 'returns state unchanged if allTokens is missing',
      state: createValidState({}),
    },
    {
      description: 'returns state unchanged if allTokens is not an object',
      state: createValidState({ allTokens: 'invalid' }),
    },
    {
      description: 'returns state unchanged if allTokens is empty',
      state: createValidState({ allTokens: {} }),
    },
    {
      description: 'leaves token with numeric decimals unchanged',
      state: createValidState({
        allTokens: {
          '0x1': {
            '0xabc': [
              {
                address: '0xtoken',
                symbol: 'TKN',
                decimals: 6,
                name: 'Token',
              },
            ],
          },
        },
      }),
    },
    {
      description: 'leaves token without decimals key unchanged',
      state: createValidState({
        allTokens: {
          '0x1': {
            '0xacc': [{ address: '0xtoken', symbol: 'TKN', name: 'Token' }],
          },
        },
      }),
    },
    {
      description: 'does not modify state if allTokens is empty object',
      state: createValidState({ allTokens: {} }),
    },
  ];

  it.each(unchangedTestCases)('$description', ({ state }) => {
    const orgState = cloneDeep(state);
    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(orgState);
  });

  const successTestCases: {
    description: string;
    state: ValidState;
    expectedTokensController: Record<string, unknown>;
  }[] = [
    {
      description: 'normalizes token with string decimals to number',
      state: createValidState({
        allTokens: {
          '0x2105': {
            '0x3eb132069c3c4f6c8632505fd344925645eb27c5': [
              {
                address: '0x6a72d3A87f97a0fEE2c2ee4233BdAEBc32813D7a',
                symbol: 'ESX',
                decimals: '9',
                name: 'EstateX',
              },
            ],
          },
        },
      }),
      expectedTokensController: {
        allTokens: {
          '0x2105': {
            '0x3eb132069c3c4f6c8632505fd344925645eb27c5': [
              {
                address: '0x6a72d3A87f97a0fEE2c2ee4233BdAEBc32813D7a',
                symbol: 'ESX',
                decimals: 9,
                name: 'EstateX',
              },
            ],
          },
        },
      },
    },
    {
      description:
        'normalizes only string decimals when mix of number and string',
      state: createValidState({
        allTokens: {
          '0x1': {
            '0xacc': [
              { address: '0xa', symbol: 'A', decimals: 6, name: 'A' },
              { address: '0xb', symbol: 'B', decimals: '18', name: 'B' },
              { address: '0xc', symbol: 'C', decimals: 8, name: 'C' },
            ],
          },
        },
      }),
      expectedTokensController: {
        allTokens: {
          '0x1': {
            '0xacc': [
              { address: '0xa', symbol: 'A', decimals: 6, name: 'A' },
              { address: '0xb', symbol: 'B', decimals: 18, name: 'B' },
              { address: '0xc', symbol: 'C', decimals: 8, name: 'C' },
            ],
          },
        },
      },
    },
    {
      description:
        'normalizes string decimals across multiple chains and accounts',
      state: createValidState({
        allTokens: {
          '0x1': {
            '0xacc1': [
              { address: '0xa', symbol: 'A', decimals: '6', name: 'A' },
            ],
            '0xacc2': [
              { address: '0xb', symbol: 'B', decimals: '18', name: 'B' },
            ],
          },
          '0x2105': {
            '0xacc3': [
              { address: '0xc', symbol: 'C', decimals: '9', name: 'C' },
            ],
          },
        },
      }),
      expectedTokensController: {
        allTokens: {
          '0x1': {
            '0xacc1': [{ address: '0xa', symbol: 'A', decimals: 6, name: 'A' }],
            '0xacc2': [
              { address: '0xb', symbol: 'B', decimals: 18, name: 'B' },
            ],
          },
          '0x2105': {
            '0xacc3': [{ address: '0xc', symbol: 'C', decimals: 9, name: 'C' }],
          },
        },
      },
    },
    {
      description: 'sets decimals to 0 when string is invalid',
      state: createValidState({
        allTokens: {
          '0x1': {
            '0xacc': [
              {
                address: '0xtoken',
                symbol: 'TKN',
                decimals: 'abc',
                name: 'Token',
              },
            ],
          },
        },
      }),
      expectedTokensController: {
        allTokens: {
          '0x1': {
            '0xacc': [
              {
                address: '0xtoken',
                symbol: 'TKN',
                decimals: 0,
                name: 'Token',
              },
            ],
          },
        },
      },
    },
    {
      description: 'normalizes decimals in allDetectedTokens when present',
      state: createValidState({
        allTokens: {},
        allDetectedTokens: {
          '0x1': {
            '0xacc': [
              {
                address: '0xdetected',
                symbol: 'DET',
                decimals: '12',
                name: 'Detected',
              },
            ],
          },
        },
      }),
      expectedTokensController: {
        allTokens: {},
        allDetectedTokens: {
          '0x1': {
            '0xacc': [
              {
                address: '0xdetected',
                symbol: 'DET',
                decimals: 12,
                name: 'Detected',
              },
            ],
          },
        },
      },
    },
  ];

  it.each(successTestCases)(
    '$description',
    ({ state, expectedTokensController }) => {
      const migratedState = migrate(state) as ValidState;
      const tokensControllerState =
        migratedState.engine.backgroundState.TokensController;

      expect(tokensControllerState).toStrictEqual(expectedTokensController);
    },
  );
});
