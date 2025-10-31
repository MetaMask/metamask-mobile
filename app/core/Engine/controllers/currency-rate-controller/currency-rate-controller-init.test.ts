import { CurrencyRateController } from '@metamask/assets-controllers';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import {
  currencyRateControllerInit,
  CurrencyRateMessenger,
} from './currency-rate-controller-init';
import { defaultCurrencyRateState } from './constants';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/assets-controllers');

describe('currency rate controller init', () => {
  const currencyRateControllerClassMock = jest.mocked(CurrencyRateController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<CurrencyRateMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(
      currencyRateControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(CurrencyRateController);
  });

  it('controller state is default state when no initial state is passed in', () => {
    currencyRateControllerInit(initRequestMock);
    const currencyRateControllerState =
      currencyRateControllerClassMock.mock.calls[0][0].state;

    // Check that the default state is used
    expect(currencyRateControllerState?.currentCurrency).toEqual(
      defaultCurrencyRateState.currentCurrency,
    );

    // The default state has empty currencyRates, but the controller adds ETH during initialization
    // So we should check that the currencyRates object exists but don't expect specific properties
    expect(currencyRateControllerState?.currencyRates).toBeDefined();

    // We can't directly test for ETH property since the mock doesn't actually run the initialization logic
    // Instead, we'll verify that the controller was initialized with the right parameters
    expect(currencyRateControllerClassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          currentCurrency: 'usd',
          currencyRates: expect.any(Object),
        }),
      }),
    );
  });

  it('controller state is initial state when initial state is passed in', () => {
    // Create initial state
    const initialCurrencyRateState = {
      currentCurrency: 'eur',
      currencyRates: {
        ETH: {
          conversionRate: 1500,
          conversionDate: 1646092800000,
          usdConversionRate: 1600,
        },
        BTC: {
          conversionRate: 25000,
          conversionDate: 1646092800000,
          usdConversionRate: 26000,
        },
      },
    };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      CurrencyRateController: initialCurrencyRateState,
    };

    currencyRateControllerInit(initRequestMock);
    const currencyRateControllerState =
      currencyRateControllerClassMock.mock.calls[0][0].state;

    // Check that the initial state is used
    expect(currencyRateControllerState?.currentCurrency).toEqual('eur');

    // Check that the currencyRates have the initial values
    expect(currencyRateControllerState?.currencyRates).toHaveProperty('ETH');
    expect(currencyRateControllerState?.currencyRates?.ETH.conversionRate).toBe(
      1500,
    );
    expect(currencyRateControllerState?.currencyRates).toHaveProperty('BTC');
    expect(currencyRateControllerState?.currencyRates?.BTC.conversionRate).toBe(
      25000,
    );
  });

  it('normalizes null conversionRates to 0', () => {
    // Create initial state with null conversionRate
    const initialCurrencyRateState = {
      currentCurrency: 'usd',
      currencyRates: {
        ETH: {
          conversionRate: null,
          conversionDate: 1646092800000,
          usdConversionRate: 1600,
        },
      },
    };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      CurrencyRateController: initialCurrencyRateState,
    };

    currencyRateControllerInit(initRequestMock);
    const currencyRateControllerState =
      currencyRateControllerClassMock.mock.calls[0][0].state;

    // Check that null conversionRate is normalized to 0
    expect(currencyRateControllerState?.currencyRates?.ETH.conversionRate).toBe(
      0,
    );
  });
});
