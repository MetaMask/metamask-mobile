import useIntentAmount from './useIntentAmount';
import type { RampSDK } from '../sdk';
import type { CryptoCurrency, FiatCurrency } from '@consensys/on-ramp-sdk';
import { renderHook } from '@testing-library/react-native';

const mockCryptoCurrenciesData = [
  {
    id: '2',
    idv2: '3',
    network: {},
    symbol: 'ETH',
    logo: 'some_random_logo_url',
    decimals: 8,
    address: '0xabc',
    name: 'Ethereum',
    limits: ['0.001', '8'],
  },
  {
    id: '3',
    idv2: '4',
    network: {},
    symbol: 'UNI',
    logo: 'uni_logo_url',
    decimals: 8,
    address: '0x1a2b3c',
    name: 'Uniswap',
    limits: ['0.001', '8'],
  },
] as CryptoCurrency[];

const mockFiatCurrenciesData = [
  {
    id: '2',
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 2,
    denomSymbol: '$',
  },
  {
    id: '3',
    symbol: 'EUR',
    name: 'Euro',
    decimals: 2,
    denomSymbol: '€',
  },
] as FiatCurrency[];

const mockSetAmount = jest.fn();
const mockSetAmountNumber = jest.fn();
const mockSetAmountBNMinimalUnit = jest.fn();

const mockSetIntent = jest.fn();

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  selectedAsset: mockCryptoCurrenciesData[0],
  isBuy: true,
  isSell: false,
  intent: { amount: '100' },
  setIntent: mockSetIntent,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

describe('useIntentAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
  });

  it('sets the amount and amount number correctly for buy', () => {
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).toHaveBeenCalledWith('100');
    expect(mockSetAmountNumber).toHaveBeenCalledWith(100);
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('sets the amount and amount number correctly for buy with 2 decimals', () => {
    mockUseRampSDKValues.intent = {
      amount: '100.23',
    };
    const currentFiatCurrency = {
      ...mockFiatCurrenciesData[0],
      decimals: 2,
    };
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).toHaveBeenCalledWith('100.23');
    expect(mockSetAmountNumber).toHaveBeenCalledWith(100.23);
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('sets the amount and amount number correctly for buy with 0 decimals', () => {
    mockUseRampSDKValues.intent = {
      amount: '100.23',
    };
    const currentFiatCurrency = {
      ...mockFiatCurrenciesData[0],
      decimals: 0,
    };
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).toHaveBeenCalledWith('100');
    expect(mockSetAmountNumber).toHaveBeenCalledWith(100);
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('sets the amount and amount big number  correctly for sell', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.intent = {
      amount: '100.12345678',
    };
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).toHaveBeenCalledWith('100.12345678');
    expect(mockSetAmountNumber.mock.calls).toMatchInlineSnapshot(`
      [
        [
          100.12345678,
        ],
      ]
    `);
    expect(mockSetAmountBNMinimalUnit.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "254c8454e",
        ],
      ]
    `);
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('sets the amount and amount big number correctly for sell with 4 decimals', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.intent = {
      amount: '100.12345678',
    };
    mockUseRampSDKValues.selectedAsset = {
      ...mockCryptoCurrenciesData[0],
      decimals: 4,
    };
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).toHaveBeenCalledWith('100.1234');
    expect(mockSetAmountNumber.mock.calls).toMatchInlineSnapshot(`
      [
        [
          100.1234,
        ],
      ]
    `);
    expect(mockSetAmountBNMinimalUnit.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "f4712",
        ],
      ]
    `);
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('sets the amount and amount big number correctly for sell with 0 decimals', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.intent = {
      amount: '100.12345678',
    };
    mockUseRampSDKValues.selectedAsset = {
      ...mockCryptoCurrenciesData[0],
      decimals: 0,
    };
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).toHaveBeenCalledWith('100');
    expect(mockSetAmountNumber.mock.calls).toMatchInlineSnapshot(`
      [
        [
          100,
        ],
      ]
    `);
    expect(mockSetAmountBNMinimalUnit.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "64",
        ],
      ]
    `);
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('sets the amount and amount big number correctly for sell with 3 decimals and big amount', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.intent = {
      amount:
        '100.12345678901234567890123456789012345678901234567891234567890123456789',
    };
    mockUseRampSDKValues.selectedAsset = {
      ...mockCryptoCurrenciesData[0],
      decimals: 3,
    };
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).toHaveBeenCalledWith('100.123');
    expect(mockSetAmountNumber.mock.calls).toMatchInlineSnapshot(`
      [
        [
          100.123,
        ],
      ]
    `);
    expect(mockSetAmountBNMinimalUnit.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "1871b",
        ],
      ]
    `);
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('does not call setters when amount is invalid for buy', () => {
    mockUseRampSDKValues.intent = {
      amount: 'invalid',
    };
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('does not call setters when amount is invalid for sell', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.intent = {
      amount: 'invalid',
    };
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
  });

  it('does not call anything for buy when intent is undefined', () => {
    mockUseRampSDKValues.intent = undefined;
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).not.toHaveBeenCalled();
  });

  it('does not call anything for sell when intent is undefined', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.intent = undefined;
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).not.toHaveBeenCalled();
  });

  it('does not call anything for buy when fiat currency is not set', () => {
    const currentFiatCurrency = null;
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).not.toHaveBeenCalled();
  });

  it('does not call anything for sell when fiat currency is not set', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    const currentFiatCurrency = null;
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).not.toHaveBeenCalled();
  });

  it('does not call anything for buy when selectedAsset is not set', () => {
    mockUseRampSDKValues.selectedAsset = null;
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).not.toHaveBeenCalled();
  });

  it('does not call anything for sell when selectedAsset is not set', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.selectedAsset = null;
    const currentFiatCurrency = mockFiatCurrenciesData[0];
    renderHook(() =>
      useIntentAmount(
        mockSetAmount,
        mockSetAmountNumber,
        mockSetAmountBNMinimalUnit,
        currentFiatCurrency,
      ),
    );
    expect(mockSetAmount).not.toHaveBeenCalled();
    expect(mockSetAmountNumber).not.toHaveBeenCalled();
    expect(mockSetAmountBNMinimalUnit).not.toHaveBeenCalled();
    expect(mockSetIntent).not.toHaveBeenCalled();
  });
});
