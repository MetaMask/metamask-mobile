import { act } from '@testing-library/react-native';
import { RampSDK } from '../sdk';
import useFiatCurrencies from './useFiatCurrencies';
import useSDKMethod from './useSDKMethod';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

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
    );

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getFiatCurrencies',
      'test-region-id',
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
    );

    expect(useSDKMethod).toHaveBeenCalledWith(
      'getSellFiatCurrencies',
      'test-region-id',
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
      isFetchingFiatCurrencies: false,
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
      isFetchingFiatCurrency: false,
      isFetchingFiatCurrencies: true,
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
      isFetchingFiatCurrencies: false,
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
      isFetchingFiatCurrencies: false,
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

  it('updates currency when region changes and using default currency', async () => {
    const mockQueryDefaultFiatCurrency = jest.fn();
    const mockSetSelectedFiatCurrencyId = jest.fn();

    mockUseRampSDKValues.selectedRegion = { id: 'region-1' };
    mockUseRampSDKValues.selectedFiatCurrencyId = 'default-fiat-currency-id';
    mockUseRampSDKValues.setSelectedFiatCurrencyId =
      mockSetSelectedFiatCurrencyId;

    mockQueryDefaultFiatCurrency.mockResolvedValue({
      id: 'new-region-currency',
    });

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
          data: [{ id: 'default-fiat-currency-id' }],
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ])
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
          data: [{ id: 'default-fiat-currency-id' }],
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ]);

    const { rerender } = renderHookWithProvider(() => useFiatCurrencies());

    mockUseRampSDKValues.selectedRegion = { id: 'region-2' };

    await act(async () => {
      rerender(() => useFiatCurrencies());
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockQueryDefaultFiatCurrency).toHaveBeenCalledWith('region-2');
    expect(mockSetSelectedFiatCurrencyId).toHaveBeenCalledWith(
      'new-region-currency',
    );
  });

  it('does not update currency when region changes but not using default currency', async () => {
    const mockQueryDefaultFiatCurrency = jest.fn();
    const mockSetSelectedFiatCurrencyId = jest.fn();

    mockUseRampSDKValues.selectedRegion = { id: 'region-1' };
    mockUseRampSDKValues.selectedFiatCurrencyId = 'custom-currency-id';
    mockUseRampSDKValues.setSelectedFiatCurrencyId =
      mockSetSelectedFiatCurrencyId;

    (useSDKMethod as jest.Mock)
      .mockReturnValue([
        {
          data: { id: 'default-fiat-currency-id' },
          error: null,
          isFetching: false,
        },
        mockQueryDefaultFiatCurrency,
      ])
      .mockReturnValue([
        {
          data: [
            { id: 'custom-currency-id' },
            { id: 'default-fiat-currency-id' },
          ],
          error: null,
          isFetching: false,
        },
        jest.fn(),
      ]);

    const { rerender } = renderHookWithProvider(() => useFiatCurrencies());

    mockUseRampSDKValues.selectedRegion = { id: 'region-2' };

    rerender(() => useFiatCurrencies());

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSetSelectedFiatCurrencyId).not.toHaveBeenCalled();
  });
});
