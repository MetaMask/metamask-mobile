import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './143';

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = (
  selectedCurrency: string,
  currentCurrency: string,
) => ({
  engine: {
    backgroundState: {
      AssetsController: {
        selectedCurrency,
      },
      CurrencyRateController: {
        currentCurrency,
      },
    },
  },
});

describe('Migration 143: Carry over selected fiat currency', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(migratedState).toStrictEqual({ some: 'state' });
  });

  it('copies currentCurrency into selectedCurrency when they differ', () => {
    const oldState = createTestState('usd', 'eur');
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState) as typeof oldState;

    expect(
      migratedState.engine.backgroundState.AssetsController.selectedCurrency,
    ).toBe('eur');
  });

  it('leaves selectedCurrency untouched when it already matches currentCurrency', () => {
    const oldState = createTestState('eur', 'eur');
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState) as typeof oldState;

    expect(
      migratedState.engine.backgroundState.AssetsController.selectedCurrency,
    ).toBe('eur');
  });

  it.each([
    {
      currentCurrency: '',
      test: 'empty currentCurrency',
    },
    {
      currentCurrency: 123 as unknown as string,
      test: 'non-string currentCurrency',
    },
  ])(
    'does not modify selectedCurrency for invalid currentCurrency - $test',
    ({ currentCurrency }) => {
      const oldState = createTestState('usd', currentCurrency);
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = migrate(oldState) as typeof oldState;

      expect(
        migratedState.engine.backgroundState.AssetsController.selectedCurrency,
      ).toBe('usd');
    },
  );

  it.each([
    {
      state: {
        engine: {
          backgroundState: {
            CurrencyRateController: { currentCurrency: 'eur' },
          },
        },
      },
      test: 'missing AssetsController',
    },
    {
      state: {
        engine: {
          backgroundState: {
            AssetsController: 'invalid',
            CurrencyRateController: { currentCurrency: 'eur' },
          },
        },
      },
      test: 'invalid AssetsController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            AssetsController: { selectedCurrency: 'usd' },
          },
        },
      },
      test: 'missing CurrencyRateController',
    },
    {
      state: {
        engine: {
          backgroundState: {
            AssetsController: { selectedCurrency: 'usd' },
            CurrencyRateController: 'invalid',
          },
        },
      },
      test: 'invalid CurrencyRateController state',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(orgState);
  });
});
