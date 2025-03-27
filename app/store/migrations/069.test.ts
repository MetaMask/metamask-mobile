import migrate from './069';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { PRICE_API_CURRENCIES } from '../../core/Multichain/constants';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

describe('Migration: update currentCurrency in CurrencyController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception if CurrencyController is not an object', async () => {
    const state = {
      engine: {
        backgroundState: {
          CurrencyRateController: null,
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration: Invalid CurrencyController state type 'object'`,
    );
  });

  it('sets default currency if currentCurrency is invalid', async () => {
    const state = {
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'invalid',
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
    ).toBe('usd');
    expect(mockedCaptureException).not.toHaveBeenCalled();
    expect(migratedState).toBe(state);
  });

  it('does not modify state if currentCurrency is valid', async () => {
    // Use one of the valid currencies from PRICE_API_CURRENCIES.
    const validCurrency = PRICE_API_CURRENCIES[0] || 'usd';
    const state = {
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: validCurrency,
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
    ).toBe(validCurrency);
    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
