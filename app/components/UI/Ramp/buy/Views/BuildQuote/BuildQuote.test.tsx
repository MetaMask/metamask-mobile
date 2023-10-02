import React from 'react';
import { Payment } from '@consensys/on-ramp-sdk';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import BuildQuote from './BuildQuote';
import useRegions from '../../hooks/useRegions';
import { RampSDK } from '../../../common/sdk';
import Routes from '../../../../../../constants/navigation/Routes';
import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';
import useCryptoCurrencies from '../../hooks/useCryptoCurrencies';
import useFiatCurrencies from '../../hooks/useFiatCurrencies';
import usePaymentMethods from '../../hooks/usePaymentMethods';
import { mockPaymentMethods } from '../PaymentMethods/PaymentMethods.constants';
import {
  mockCryptoCurrenciesData,
  mockFiatCurrenciesData,
} from './BuildQuote.constants';
import { mockRegionsData } from '../Regions/Regions.constants';
import useLimits from '../../hooks/useLimits';

const get = (name?: string | RegExp) => screen.getByRole('button', { name });

// RENDER METHOD
function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.BUY.AMOUNT_TO_BUY,
    },
    {
      state: {
        engine: {
          backgroundState: initialBackgroundState,
        },
      },
    },
  );
}

// MOCK NAVIGATOR
const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      goBack: mockGoBack,
      reset: mockReset,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

// MOCK USE REGION HOOK
const mockQueryGetCountries = jest.fn();
const mockClearUnsupportedRegion = jest.fn();

const mockUseRegionsInitialValues: Partial<ReturnType<typeof useRegions>> = {
  data: mockRegionsData,
  isFetching: false,
  error: null,
  query: mockQueryGetCountries,
  selectedRegion: mockRegionsData[0],
  unsupportedRegion: undefined,
  clearUnsupportedRegion: mockClearUnsupportedRegion,
};

let mockUseRegionsValues: Partial<ReturnType<typeof useRegions>> = {
  ...mockUseRegionsInitialValues,
};
jest.mock('../../hooks/useRegions', () => jest.fn(() => mockUseRegionsValues));

// MOCK USE CRYPTO CURRENCIES HOOK
const mockGetCryptoCurrencies = jest.fn();

const mockUseCryptoCurrenciesInitialValues: Partial<
  ReturnType<typeof useCryptoCurrencies>
> = {
  cryptoCurrencies: mockCryptoCurrenciesData,
  errorCryptoCurrencies: null,
  isFetchingCryptoCurrencies: false,
  queryGetCryptoCurrencies: mockGetCryptoCurrencies,
};

let mockUseCryptoCurrenciesValues: Partial<
  ReturnType<typeof useCryptoCurrencies>
> = {
  ...mockUseCryptoCurrenciesInitialValues,
};
jest.mock('../../hooks/useCryptoCurrencies', () =>
  jest.fn(() => mockUseCryptoCurrenciesValues),
);

// MOCK USE FIAT CURRENCIES HOOK
const mockGetFiatCurrencies = jest.fn();

const mockUseFiatCurrenciesInitialValues: Partial<
  ReturnType<typeof useFiatCurrencies>
> = {
  defaultFiatCurrency: mockFiatCurrenciesData[0],
  queryDefaultFiatCurrency: mockGetFiatCurrencies,
  fiatCurrencies: mockFiatCurrenciesData,
  queryGetFiatCurrencies: mockGetFiatCurrencies,
  errorFiatCurrency: null,
  isFetchingFiatCurrency: false,
  currentFiatCurrency: mockFiatCurrenciesData[0],
};

let mockUseFiatCurrenciesValues: Partial<ReturnType<typeof useFiatCurrencies>> =
  {
    ...mockUseFiatCurrenciesInitialValues,
  };
jest.mock('../../hooks/useFiatCurrencies', () =>
  jest.fn(() => mockUseFiatCurrenciesValues),
);

// MOCK USE PAYMENT METHODS HOOK
const mockQueryGetPaymentMethods = jest.fn();

const mockUsePaymentMethodsInitialValues: Partial<
  ReturnType<typeof usePaymentMethods>
> = {
  data: mockPaymentMethods as Payment[],
  isFetching: false,
  error: null,
  query: mockQueryGetPaymentMethods,
  currentPaymentMethod: mockPaymentMethods[0] as Payment,
};

let mockUsePaymentMethodsValues = {
  ...mockUsePaymentMethodsInitialValues,
};

jest.mock('../../hooks/usePaymentMethods', () =>
  jest.fn(() => mockUsePaymentMethodsValues),
);

// MOCK USE LIMITS HOOK
const MAX_LIMIT = 4;
const VALID_AMOUNT = 3;
const MIN_LIMIT = 2;
const mockUseLimitsInitialValues: Partial<ReturnType<typeof useLimits>> = {
  limits: {
    minAmount: MIN_LIMIT,
    maxAmount: MAX_LIMIT,
    feeDynamicRate: 1,
    feeFixedRate: 1,
    quickAmounts: [100, 500, 1000],
  },
  isAmountBelowMinimum: jest
    .fn()
    .mockImplementation((amount) => amount < MIN_LIMIT),
  isAmountAboveMaximum: jest
    .fn()
    .mockImplementation((amount) => amount > MAX_LIMIT),
  isAmountValid: jest.fn(),
};

let mockUseLimitsValues = {
  ...mockUseLimitsInitialValues,
};

jest.mock('../../hooks/useLimits', () => jest.fn(() => mockUseLimitsValues));

// MOCK RAMP SDK
const mockSetSelectedRegion = jest.fn();
const mockSetSelectedPaymentMethodId = jest.fn();
const mockSetSelectedAsset = jest.fn();
const mockSetSelectedFiatCurrencyId = jest.fn();

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  selectedPaymentMethodId: mockPaymentMethods[0].id,
  selectedRegion: mockRegionsData[0],
  setSelectedRegion: mockSetSelectedRegion,
  selectedAsset: mockCryptoCurrenciesData[0],
  setSelectedAsset: mockSetSelectedAsset,
  selectedFiatCurrencyId: mockFiatCurrenciesData[0].id,
  setSelectedFiatCurrencyId: mockSetSelectedFiatCurrencyId,
  selectedChainId: '1',
  selectedNetworkName: 'Ethereum',
  sdkError: undefined,
  setSelectedPaymentMethodId: mockSetSelectedPaymentMethodId,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../../common/sdk', () => ({
  ...jest.requireActual('../../../common/sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

let mockUseParamsValues: {
  showBack?: boolean;
} = {
  showBack: undefined,
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock('../../../common/hooks/useAnalytics', () => () => mockTrackEvent);

describe('BuildQuote View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
    mockTrackEvent.mockClear();
    (mockUseRampSDKInitialValues.setSelectedRegion as jest.Mock).mockClear();
  });

  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
    };
    mockUseCryptoCurrenciesValues = {
      ...mockUseCryptoCurrenciesInitialValues,
    };
    mockUseFiatCurrenciesValues = {
      ...mockUseFiatCurrenciesInitialValues,
    };
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
    };
    mockUseLimitsValues = {
      ...mockUseLimitsInitialValues,
    };
    mockUseParamsValues = {
      showBack: undefined,
    };
  });

  it('renders correctly', async () => {
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  // REGION TEST
  it('calls setSelectedRegion when selecting a region', async () => {
    render(BuildQuote);
    const regionButton = get(mockRegionsData[0].emoji);
    await act(async () => {
      fireEvent.press(regionButton);
    });
    const newRegionButton = get(mockRegionsData[1].name);
    await act(async () => {
      fireEvent.press(newRegionButton);
    });
    expect(mockSetSelectedRegion).toHaveBeenCalledWith(mockRegionsData[1]);
  });

  // CRYPTO TEST
  it('calls setSelectedAsset when selecting a crypto', async () => {
    render(BuildQuote);
    const cryptoButton = get(mockCryptoCurrenciesData[0].name);
    fireEvent.press(cryptoButton);
    const newCryptoButton = get(mockCryptoCurrenciesData[1].name);
    fireEvent.press(newCryptoButton);
    expect(mockSetSelectedAsset).toHaveBeenCalledWith(
      mockCryptoCurrenciesData[1],
    );
  });

  // PAYMENT METHOD TEST
  it('calls setSelectedPaymentMethodId when selecting a payment method', async () => {
    render(BuildQuote);
    const paymentMethodButton = get(mockPaymentMethods[0].name);
    fireEvent.press(paymentMethodButton);
    const newPaymentMethodButton = get(mockPaymentMethods[1].name);
    fireEvent.press(newPaymentMethodButton);
    expect(mockSetSelectedPaymentMethodId).toHaveBeenCalledWith(
      mockPaymentMethods[1]?.id,
    );
  });

  // FIAT TEST
  it('calls setSelectedFiatCurrencyId when selecting a new fiat', async () => {
    render(BuildQuote);
    const fiatButton = get(mockFiatCurrenciesData[0].symbol);
    fireEvent.press(fiatButton);
    const newFiatButton = get(mockFiatCurrenciesData[1].symbol);
    fireEvent.press(newFiatButton);
    expect(mockSetSelectedFiatCurrencyId).toHaveBeenCalledWith(
      mockFiatCurrenciesData[1]?.id,
    );
  });

  it.only('updates the amount input', async () => {
    const validAmount = VALID_AMOUNT.toString();
    render(BuildQuote);

    // click the amount input to open the keyboard
    const symbol = mockFiatCurrenciesData[0].denomSymbol;
    const amount = '0';

    const button = get(symbol);

    fireEvent.press(button);
    // click a keyboard button such as "3"
    fireEvent.press(get(validAmount));

    // expect the value to change
    expect(get('$3')).toBeTruthy();
  });

  it('updates the amount input and validates the amount against limits', () => {
    const invalidMaxAmount = (MAX_LIMIT + 1).toString();
    const invalidMinAmount = (MIN_LIMIT - 1).toString();
    const validAmount = VALID_AMOUNT.toString();

    render(BuildQuote);
    fireEvent.press(get('$0'));
    let keyPad = get(validAmount);
    fireEvent.press(keyPad);
    // expect amount input's value to be the valid amount
    let amountInput = get('$0');
    // assert on the value of amount
    expect(amountInput.props.children[1]).toBe(validAmount);
    // expect the max and min alerts to not exist
    let moreThanMaxWarning = screen.queryByTestId('above-max-alert');
    expect(moreThanMaxWarning).toBeFalsy();
    let lessThanMinWarning = screen.queryByTestId('below-min-alert');
    expect(lessThanMinWarning).toBeFalsy();

    // CHECK THAT LARGE AMOUNTS SHOW MAX ERROR
    // click the amount input to open the keypad
    fireEvent.press(screen.queryByTestId('amount-input'));
    // clear the prev value
    fireEvent.press(screen.getByTestId('keypad-delete-button'));
    // enter a large amount
    keyPad = get(invalidMaxAmount);
    fireEvent.press(keyPad);
    // expect amount input's value to be the valid amount
    amountInput = screen.getByTestId('amount-input');
    // assert on the value of amount
    expect(amountInput.props.children[1]).toBe(invalidMaxAmount);
    // expect the max and min alerts to not exist
    moreThanMaxWarning = screen.queryByTestId('above-max-alert');
    expect(moreThanMaxWarning).toBeTruthy();
    lessThanMinWarning = screen.queryByTestId('below-min-alert');
    expect(lessThanMinWarning).toBeFalsy();

    // CHECK THAT SMALL AMOUNTS SHOW MINIMUM ERROR
    // click the amount input to open the keypad
    fireEvent.press(screen.queryByTestId('amount-input'));
    // remove the previous value
    fireEvent.press(screen.getByTestId('keypad-delete-button'));
    // enter a small amount
    keyPad = get(invalidMinAmount);
    fireEvent.press(keyPad);
    // expect amount input's value to be the valid amount
    amountInput = screen.getByTestId('amount-input');
    // assert on the value of amount
    expect(amountInput.props.children[1]).toBe(invalidMinAmount);
    // expect the max and min alerts to not exist
    moreThanMaxWarning = screen.queryByTestId('above-max-alert');
    expect(moreThanMaxWarning).toBeFalsy();
    lessThanMinWarning = screen.queryByTestId('below-min-alert');
    expect(lessThanMinWarning).toBeTruthy();
  });

  it('Directs the user to the quotes page with correct parameters', () => {
    // render the build quote page with mocked data
    render(BuildQuote);
  });
});
