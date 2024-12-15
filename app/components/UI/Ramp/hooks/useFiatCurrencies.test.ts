import { RampSDK } from '../sdk';
import useFiatCurrencies from './useFiatCurrencies';
import useSDKMethod from './useSDKMethod';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockuseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedRegion: { id: 'test-region-id' },
  selectedPaymentMethodId: 'test-payment-method-id',
  selectedFiatCurrencyId: 'test-fiat-currency-id-1',
  setSelectedFiatCurrencyId: jest.fn(),
  isBuy: true,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('./useSDKMethod');

describe('useFiatCurrencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
  });

  it('calls useSDKMethod with the correct parameters for buy', () => {
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithProvider(() => useFiatCurrencies());

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getDefaultFiatCurrency',
      'test-region-id',
      'test-payment-method-id',
    );

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getFiatCurrencies',
      'test-region-id',
      'test-payment-method-id',
    );
  });

  it('calls useSDKMethod with the correct parameters for sell', () => {
    mockUseRampSDKValues.isBuy = false;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithProvider(() => useFiatCurrencies());

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getDefaultSellFiatCurrency',
      'test-region-id',
      'test-payment-method-id',
    );

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getSellFiatCurrencies',
      'test-region-id',
      'test-payment-method-id',
    );
  });

  it('returns loading state if fetching default fiat currency', () => {
    const mockQueryDefaultFiatCurrency = jest.fn();
    const mockQueryGetFiatCurrencies = jest.fn();
    // Mocked return values for getDefaultFiatCurrency and getFiatCurrencies
    (useSDKMethod as jest.Mock)
      .mockReturnValueOnce([
        {
          data: null,
          error: null,
          isFetching: true,
        },
        mockQueryDefaultFiatCurrency,
      ])
      .mockReturnValueOnce([
        {
          data: [
            { id: 'test-fiat-currency-id-1' },
            { id: 'test-fiat-currency-id-2' },
            { id: 'default-fiat-currency-id' },
          ],
          error: null,
          isFetching: false,
        },
        mockQueryGetFiatCurrencies,
      ]);
    const { result } = renderHookWithProvider(() => useFiatCurrencies());
    expect(result.current).toEqual({
      defaultFiatCurrency: null,
      queryDefaultFiatCurrency: mockQueryDefaultFiatCurrency,
      fiatCurrencies: [
        { id: 'test-fiat-currency-id-1' },
        { id: 'test-fiat-currency-id-2' },
        { id: 'default-fiat-currency-id' },
      ],
      queryGetFiatCurrencies: mockQueryGetFiatCurrencies,
      errorFiatCurrency: null,
      isFetchingFiatCurrency: true,
      currentFiatCurrency: { id: 'test-fiat-currency-id-1' },
    });
  });

  it('returns loading state if fetching fiat currencies', () => {
    const mockQueryDefaultFiatCurrency = jest.fn();
    const mockQueryGetFiatCurrencies = jest.fn();
    // Mocked return values for getDefaultFiatCurrency and getFiatCurrencies
    (useSDKMethod as jest.Mock)
      .mockReturnValueOnce([
        {
          data: { id: 'default-fiat-currency-id' },
          error: null,
          isFetching: false,
        },
        mockQueryDefaultFiatCurrency,
      ])
      .mockReturnValueOnce([
        {
          data: null,
          error: null,
          isFetching: true,
        },
        mockQueryGetFiatCurrencies,
      ]);
    const { result } = renderHookWithProvider(() => useFiatCurrencies());
    expect(result.current).toEqual({
      defaultFiatCurrency: { id: 'default-fiat-currency-id' },
      queryDefaultFiatCurrency: mockQueryDefaultFiatCurrency,
      fiatCurrencies: null,
      queryGetFiatCurrencies: mockQueryGetFiatCurrencies,
      errorFiatCurrency: null,
      isFetchingFiatCurrency: true,
      currentFiatCurrency: { id: 'default-fiat-currency-id' },
    });
  });

  it('returns error state if there is an error fetching default fiat currency', () => {
    const mockQueryDefaultFiatCurrency = jest.fn();
    const mockQueryGetFiatCurrencies = jest.fn();
    // Mocked return values for getDefaultFiatCurrency and getFiatCurrencies
    (useSDKMethod as jest.Mock)
      .mockReturnValueOnce([
        {
          data: null,
          error: 'error-fetching-default-fiat-currency',
          isFetching: false,
        },
        mockQueryDefaultFiatCurrency,
      ])
      .mockReturnValueOnce([
        {
          data: [
            { id: 'test-fiat-currency-id-1' },
            { id: 'test-fiat-currency-id-2' },
            { id: 'default-fiat-currency-id' },
          ],
          error: null,
          isFetching: false,
        },
        mockQueryGetFiatCurrencies,
      ]);
    const { result } = renderHookWithProvider(() => useFiatCurrencies());
    expect(result.current).toEqual({
      defaultFiatCurrency: null,
      queryDefaultFiatCurrency: mockQueryDefaultFiatCurrency,
      fiatCurrencies: [
        { id: 'test-fiat-currency-id-1' },
        { id: 'test-fiat-currency-id-2' },
        { id: 'default-fiat-currency-id' },
      ],
      queryGetFiatCurrencies: mockQueryGetFiatCurrencies,
      errorFiatCurrency: 'error-fetching-default-fiat-currency',
      isFetchingFiatCurrency: false,
      currentFiatCurrency: { id: 'test-fiat-currency-id-1' },
    });
  });

  it('returns error state if there is an error fetching fiat currencies', () => {
    const mockQueryDefaultFiatCurrency = jest.fn();
    const mockQueryGetFiatCurrencies = jest.fn();
    // Mocked return values for getDefaultFiatCurrency and getFiatCurrencies
    (useSDKMethod as jest.Mock)
      .mockReturnValueOnce([
        {
          data: { id: 'default-fiat-currency-id' },
          error: null,
          isFetching: false,
        },
        mockQueryDefaultFiatCurrency,
      ])
      .mockReturnValueOnce([
        {
          data: null,
          error: 'error-fetching-fiat-currencies',
          isFetching: false,
        },
        mockQueryGetFiatCurrencies,
      ]);
    const { result } = renderHookWithProvider(() => useFiatCurrencies());
    expect(result.current).toEqual({
      defaultFiatCurrency: { id: 'default-fiat-currency-id' },
      queryDefaultFiatCurrency: mockQueryDefaultFiatCurrency,
      fiatCurrencies: null,
      queryGetFiatCurrencies: mockQueryGetFiatCurrencies,
      errorFiatCurrency: 'error-fetching-fiat-currencies',
      isFetchingFiatCurrency: false,
      currentFiatCurrency: { id: 'default-fiat-currency-id' },
    });
  });

  it('selects the default fiat currency if none is selected', () => {
    mockUseRampSDKValues.selectedFiatCurrencyId = null;

    // Mocked return values for getDefaultFiatCurrency and getFiatCurrencies
    (useSDKMethod as jest.Mock)
      .mockReturnValueOnce([
        {
          data: { id: 'default-fiat-currency-id' },
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ])
      .mockReturnValueOnce([
        {
          data: [
            { id: 'test-fiat-currency-id-1' },
            { id: 'test-fiat-currency-id-2' },
            { id: 'default-fiat-currency-id' },
          ],
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ]);
    renderHookWithProvider(() => useFiatCurrencies());

    expect(mockUseRampSDKValues.setSelectedFiatCurrencyId).toHaveBeenCalledWith(
      'default-fiat-currency-id',
    );
  });

  it('selects the default fiat currency if current selection is not available', () => {
    mockUseRampSDKValues.selectedFiatCurrencyId = 'test-fiat-currency-id-3';

    // Mocked return values for getDefaultFiatCurrency and getFiatCurrencies
    (useSDKMethod as jest.Mock)
      .mockReturnValueOnce([
        {
          data: { id: 'default-fiat-currency-id' },
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ])
      .mockReturnValueOnce([
        {
          data: [
            { id: 'test-fiat-currency-id-1' },
            { id: 'test-fiat-currency-id-2' },
            { id: 'default-fiat-currency-id' },
          ],
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ]);
    renderHookWithProvider(() => useFiatCurrencies());

    expect(mockUseRampSDKValues.setSelectedFiatCurrencyId).toHaveBeenCalledWith(
      'default-fiat-currency-id',
    );
  });

  it('does not select the default fiat currency if current selection is available', () => {
    mockUseRampSDKValues.selectedFiatCurrencyId = 'test-fiat-currency-id-2';

    // Mocked return values for getDefaultFiatCurrency and getFiatCurrencies
    (useSDKMethod as jest.Mock)
      .mockReturnValueOnce([
        {
          data: { id: 'default-fiat-currency-id' },
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ])
      .mockReturnValueOnce([
        {
          data: [
            { id: 'test-fiat-currency-id-1' },
            { id: 'test-fiat-currency-id-2' },
            { id: 'default-fiat-currency-id' },
          ],
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ]);
    renderHookWithProvider(() => useFiatCurrencies());

    expect(
      mockUseRampSDKValues.setSelectedFiatCurrencyId,
    ).not.toHaveBeenCalled();
  });
});
