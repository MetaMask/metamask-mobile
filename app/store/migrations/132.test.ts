import { zeroAddress } from 'ethereumjs-util';
import { cloneDeep } from 'lodash';

import migrate from './132';
import { ensureValidState, ValidState } from './util';

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const ZERO_ADDRESS = zeroAddress();

describe('migration 132', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(ensureValidState).mockReturnValue(true);
  });

  it('does not modify the state if `ensureValidState` returns `false`', () => {
    const state = { some: 'state' };
    jest.mocked(ensureValidState).mockReturnValueOnce(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('migrate balances to 0x0 ONLY for native, ONLY for Tempo chains and FOR ALL accounts', async () => {
    const state = {
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              '0xbf4ed7b27f1d666546861667caba0eecca747d7d': {
                '0x1': {
                  [ZERO_ADDRESS]: '0x42',
                },
                '0x1079': {
                  [ZERO_ADDRESS]: '0x0',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
                '0xa5bf': {
                  [ZERO_ADDRESS]: '0x0',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
              },
              '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8': {
                '0x1': {
                  [ZERO_ADDRESS]: '0x42',
                },
                '0x1079': {
                  [ZERO_ADDRESS]:
                    '0x9612084f0316e0ebd5182f398e5195a51b5ca47667d4c9b26c9b26c9b26c9b2',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
                '0xa5bf': {
                  [ZERO_ADDRESS]: '0x0',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
              },
              '0xd8da6bf26964af9d7eed9e03e53415d37aa96045': {
                '0x1': {
                  [ZERO_ADDRESS]: '0x42',
                },
                '0x1079': {
                  [ZERO_ADDRESS]:
                    '0x9612084f0316e0ebd5182f398e5195a51b5ca47667d4c9b26c9b26c9b26c9b2',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
                '0xa5bf': {
                  [ZERO_ADDRESS]:
                    '0x9612084f0316e0ebd5182f398e5195a51b5ca47667d4c9b26c9b26c9b26c9b2',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
              },
            },
          },
        },
      },
    };

    const result = migrate(state) as ValidState;

    expect(result.engine.backgroundState.TokenBalancesController).toStrictEqual(
      {
        tokenBalances: {
          '0xbf4ed7b27f1d666546861667caba0eecca747d7d': {
            '0x1': {
              [ZERO_ADDRESS]: '0x42',
            },
            '0x1079': {
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
            '0xa5bf': {
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
          },
          '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8': {
            '0x1': {
              [ZERO_ADDRESS]: '0x42',
            },
            '0x1079': {
              // Migrated
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
            '0xa5bf': {
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
          },
          '0xd8da6bf26964af9d7eed9e03e53415d37aa96045': {
            '0x1': {
              [ZERO_ADDRESS]: '0x42',
            },
            '0x1079': {
              // Migrated
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
            '0xa5bf': {
              // Migrated
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
          },
        },
      },
    );
  });

  it('does not mark the controller as migrated if no change happened', async () => {
    const state = {
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              '0xbf4ed7b27f1d666546861667caba0eecca747d7d': {
                '0x1': {
                  [ZERO_ADDRESS]: '0x42',
                },
                '0x1079': {
                  [ZERO_ADDRESS]: '0x0',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
                '0xa5bf': {
                  [ZERO_ADDRESS]: '0x0',
                  '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
                },
              },
            },
          },
        },
      },
    };

    // const versionedData = cloneDeep(oldStorage);
    // const changedControllers = new Set<string>();

    const result = migrate(state) as ValidState;

    expect(result.engine.backgroundState.TokenBalancesController).toStrictEqual(
      {
        tokenBalances: {
          '0xbf4ed7b27f1d666546861667caba0eecca747d7d': {
            '0x1': {
              [ZERO_ADDRESS]: '0x42',
            },
            '0x1079': {
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
            '0xa5bf': {
              [ZERO_ADDRESS]: '0x0',
              '0x20c000000000000000000000b9537d11c60e8b50': '0x123',
            },
          },
        },
      },
    );
  });

  it('does nothing when TokenBalancesController is missing', async () => {
    const state = {
      engine: {
        backgroundState: {
          SomeOtherController: {},
        },
      },
    };

    const oldState = cloneDeep(state);
    const result = migrate(state);

    expect(result).toStrictEqual(oldState);
  });

  it('does nothing when TokenBalancesController is of incorrect type', async () => {
    const state = {
      engine: {
        backgroundState: {
          TokenBalancesController: 'I am not an object',
        },
      },
    };

    const oldState = cloneDeep(state);
    const result = migrate(state);

    expect(result).toStrictEqual(oldState);
  });

  it('does nothing when tokenBalances object is missing', async () => {
    const state = {
      engine: {
        backgroundState: {
          TokenBalancesController: {
            iamNotTheTokenBalanceObject: {},
          },
        },
      },
    };

    const oldState = cloneDeep(state);
    const result = migrate(state);

    expect(result).toStrictEqual(oldState);
  });
});
