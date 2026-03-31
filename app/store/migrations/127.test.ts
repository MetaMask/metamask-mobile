import migrate from './127';

const oldState = {
  meta: { version: 126 },
  engine: {
    backgroundState: {
      NetworkController: { selectedNetworkClientId: 'mainnet' },
      SwapsController: {
        quotes: {},
        quoteValues: {},
        tokens: null,
        topAssets: null,
        pollingCyclesLeft: 3,
        chainCache: {
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
          },
        },
      },
    },
  },
};

describe('Migration 127: Remove SwapsController from persisted state', () => {
  it('removes SwapsController from backgroundState', async () => {
    const result = (await migrate(oldState)) as typeof oldState;
    expect(result.engine.backgroundState).not.toHaveProperty('SwapsController');
    expect(result.engine.backgroundState).toHaveProperty('NetworkController');
  });

  it('does nothing if SwapsController is not present', async () => {
    const stateWithout = {
      meta: { version: 126 },
      engine: {
        backgroundState: {
          NetworkController: { selectedNetworkClientId: 'mainnet' },
        },
      },
    };
    const result = (await migrate(stateWithout)) as typeof stateWithout;
    expect(result.engine.backgroundState).toHaveProperty('NetworkController');
    expect(result.engine.backgroundState).not.toHaveProperty('SwapsController');
  });

  it('returns state unchanged if state is invalid', async () => {
    const invalidState = { meta: { version: 126 } };
    const result = await migrate(invalidState);
    expect(result).toEqual(invalidState);
  });
});
