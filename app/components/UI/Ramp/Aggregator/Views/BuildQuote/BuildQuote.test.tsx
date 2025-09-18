import React from 'react';
import { Limits, Payment } from '@consensys/on-ramp-sdk';
import { act, fireEvent, screen } from '@testing-library/react-native';
import type BN4 from 'bnjs4';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import BuildQuote from './BuildQuote';
import useRegions from '../../hooks/useRegions';
import { RampSDK } from '../../sdk';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import useCryptoCurrencies from '../../hooks/useCryptoCurrencies';
import useFiatCurrencies from '../../hooks/useFiatCurrencies';
import usePaymentMethods from '../../hooks/usePaymentMethods';
import useGasPriceEstimation from '../../hooks/useGasPriceEstimation';
import {
  mockCryptoCurrenciesData,
  mockFiatCurrenciesData,
  mockPaymentMethods,
  mockRegionsData,
} from './BuildQuote.constants';
import useLimits from '../../hooks/useLimits';
import useAddressBalance from '../../../../../hooks/useAddressBalance/useAddressBalance';
import useBalance from '../../hooks/useBalance';
import { toTokenMinimalUnit } from '../../../../../../util/number';
import { RampType } from '../../../../../../reducers/fiatOrders/types';
import { NATIVE_ADDRESS } from '../../../../../../constants/on-ramp';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../../util/test/accountsControllerTestUtils';
import { trace, endTrace, TraceName } from '../../../../../../util/trace';
import { mockNetworkState } from '../../../../../../util/test/network';

const mockSetActiveNetwork = jest.fn();
const mockEngineContext = {
  MultichainNetworkController: {
    setActiveNetwork: mockSetActiveNetwork,
  },
};
jest.mock('../../../../../../core/Engine', () => ({
  get context() {
    return mockEngineContext;
  },
}));

const getByRoleButton = (name?: string | RegExp) =>
  screen.getByRole('button', { name });

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.BUILD_QUOTE,
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            NetworkController: {
              ...mockNetworkState(
                {
                  chainId: '0x1',
                  id: 'mainnet',
                  nickname: 'Ethereum Mainnet',
                  ticker: 'ETH',
                },
                {
                  chainId: '0x89',
                  id: 'polygon',
                  nickname: 'Polygon Mainnet',
                  ticker: 'POL',
                },
              ),
            },
          },
        },
      },
    },
  );
}

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

const mockGetFiatCurrencies = jest.fn();
const mockGetDefaultFiatCurrencies = jest.fn();

const mockUseFiatCurrenciesInitialValues: Partial<
  ReturnType<typeof useFiatCurrencies>
> = {
  defaultFiatCurrency: mockFiatCurrenciesData[0],
  queryDefaultFiatCurrency: mockGetDefaultFiatCurrencies,
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

const mockUseAddressBalanceInitialValue: ReturnType<typeof useAddressBalance> =
  {
    addressBalance: '5.36385 ETH',
  };

jest.mock('../../../../../hooks/useAddressBalance/useAddressBalance', () =>
  jest.fn(() => mockUseAddressBalanceInitialValue),
);

const mockUseBalanceInitialValue: Partial<ReturnType<typeof useBalance>> = {
  balanceFiat: '$27.02',
  balanceBN: toTokenMinimalUnit('5.36385', 18) as BN4,
};

let mockUseBalanceValues: Partial<ReturnType<typeof useBalance>> = {
  ...mockUseBalanceInitialValue,
};

jest.mock('../../hooks/useBalance', () => jest.fn(() => mockUseBalanceValues));

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
  selectedAddress: '0x2990079bcdee240329a520d2444386fc119da21a',
  selectedNetworkName: 'Ethereum',
  sdkError: undefined,
  setSelectedPaymentMethodId: mockSetSelectedPaymentMethodId,
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

let mockUseParamsValues: {
  showBack?: boolean;
} = {
  showBack: undefined,
};

const mockUseGasPriceEstimationInitialValue: ReturnType<
  typeof useGasPriceEstimation
> = {
  estimatedGasFee: toTokenMinimalUnit(
    '0.01',
    mockUseRampSDKInitialValues.selectedAsset?.decimals || 18,
  ) as BN4,
};

let mockUseGasPriceEstimationValue: ReturnType<typeof useGasPriceEstimation> =
  mockUseGasPriceEstimationInitialValue;

jest.mock('../../hooks/useGasPriceEstimation', () =>
  jest.fn(() => mockUseGasPriceEstimationValue),
);

jest.mock('../../hooks/useIntentAmount');

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

jest.mock('../../../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    RampQuoteLoading: 'Ramp Quote Loading',
    LoadRampExperience: 'Load Ramp Experience',
  },
}));

describe('BuildQuote View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
    mockTrackEvent.mockClear();
    (mockUseRampSDKInitialValues.setSelectedRegion as jest.Mock).mockClear();
    jest.clearAllMocks();
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
    mockUseGasPriceEstimationValue = {
      ...mockUseGasPriceEstimationInitialValue,
    };
  });

  //
  // RENDER & SDK TESTS
  //
  it('renders correctly', async () => {
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();

    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when sdkError is present', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();

    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
      sdkError: new Error('sdkError in sell'),
    };
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to home when clicking sdKError button', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(BuildQuote);
    fireEvent.press(
      screen.getByRole('button', { name: 'Return to Home Screen' }),
    );
    expect(mockPop).toBeCalledTimes(1);

    mockPop.mockReset();

    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
      sdkError: new Error('sdkError in sell'),
    };
    render(BuildQuote);
    fireEvent.press(
      screen.getByRole('button', { name: 'Return to Home Screen' }),
    );
    expect(mockPop).toBeCalledTimes(1);
  });

  it('calls setOptions when rendering', async () => {
    render(BuildQuote);
    expect(mockSetOptions).toHaveBeenCalled();

    mockSetOptions.mockReset();

    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    render(BuildQuote);
    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('navigates and tracks event on cancel button press', async () => {
    render(BuildQuote);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '1',
      location: 'Amount to Buy Screen',
    });

    mockPop.mockReset();
    mockTrackEvent.mockReset();

    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.rampType = RampType.SELL;
    render(BuildQuote);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('OFFRAMP_CANCELED', {
      chain_id_source: '1',
      location: 'Amount to Sell Screen',
    });
  });

  it('calls endTrace when the conditions are met', () => {
    render(BuildQuote);
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.LoadRampExperience,
    });
  });

  it('does not call endTrace if conditions are not met', () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(BuildQuote);
    expect(endTrace).not.toHaveBeenCalled();
  });

  it('only calls endTrace once', () => {
    render(BuildQuote);
    act(() => {
      mockUseRegionsValues = {
        ...mockUseRegionsInitialValues,
        isFetching: true,
      };
    });
    expect(endTrace).toHaveBeenCalledTimes(1);
  });

  describe('Regions data', () => {
    it('renders the loading page when regions are loading', async () => {
      mockUseRegionsValues = {
        ...mockUseRegionsInitialValues,
        isFetching: true,
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders an error page when there is a region error', async () => {
      mockUseRegionsValues = {
        ...mockUseRegionsInitialValues,
        error: 'Test error',
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('queries region data when error CTA is clicked', async () => {
      mockUseRegionsValues = {
        ...mockUseRegionsInitialValues,
        error: 'Test error',
      };
      render(BuildQuote);
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(mockQueryGetCountries).toBeCalledTimes(1);
    });

    it('calls setSelectedRegion when selecting a region', async () => {
      render(BuildQuote);
      await act(async () =>
        fireEvent.press(
          getByRoleButton(mockUseRegionsValues.selectedRegion?.emoji),
        ),
      );
      await act(async () =>
        fireEvent.press(getByRoleButton(mockRegionsData[1].name)),
      );
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(mockRegionsData[1]);
    });
  });

  describe('Crypto Currency Data', () => {
    it('renders the loading page when cryptos are loading', async () => {
      mockUseCryptoCurrenciesValues = {
        ...mockUseCryptoCurrenciesInitialValues,
        isFetchingCryptoCurrencies: true,
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders a special error page if crypto currencies are not available', async () => {
      mockUseCryptoCurrenciesValues = {
        ...mockUseCryptoCurrenciesInitialValues,
        cryptoCurrencies: [],
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();

      mockUseRampSDKValues.isBuy = false;
      mockUseRampSDKValues.isSell = true;
      mockUseRampSDKValues.rampType = RampType.SELL;
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders an error page when there is a cryptos error', async () => {
      mockUseCryptoCurrenciesValues = {
        ...mockUseCryptoCurrenciesInitialValues,
        errorCryptoCurrencies: 'Test error',
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('queries crypto data when error CTA is clicked', async () => {
      mockUseCryptoCurrenciesValues = {
        ...mockUseCryptoCurrenciesInitialValues,
        errorCryptoCurrencies: 'Test error',
      };
      render(BuildQuote);
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(mockGetCryptoCurrencies).toBeCalledTimes(1);
    });

    it('calls setSelectedAsset when selecting a crypto', async () => {
      render(BuildQuote);
      fireEvent.press(getByRoleButton(mockCryptoCurrenciesData[0].name));
      fireEvent.press(getByRoleButton(mockCryptoCurrenciesData[1].name));
      expect(mockSetSelectedAsset).toHaveBeenCalledWith(
        mockCryptoCurrenciesData[1],
      );
    });

    it('switches network and sets asset when selecting crypto from different chain', async () => {
      const mockPolygonToken = {
        ...mockCryptoCurrenciesData[0],
        network: {
          chainId: '137',
          active: true,
          chainName: 'Polygon',
          shortName: 'Polygon',
        },
        name: 'Polygon Token',
      };

      mockUseCryptoCurrenciesValues = {
        ...mockUseCryptoCurrenciesInitialValues,
        cryptoCurrencies: [mockCryptoCurrenciesData[0], mockPolygonToken],
      };

      render(BuildQuote);

      fireEvent.press(getByRoleButton(mockCryptoCurrenciesData[0].name));
      await act(async () => {
        fireEvent.press(getByRoleButton('Polygon Token'));
      });

      expect(mockSetActiveNetwork).toHaveBeenCalled();
      expect(mockSetSelectedAsset).toHaveBeenCalledWith(mockPolygonToken);
    });

    it('does not switch network when selecting crypto from same chain', async () => {
      mockSetActiveNetwork.mockClear();

      const mockEthereumToken = {
        ...mockCryptoCurrenciesData[0],
        network: {
          chainId: '1',
          active: true,
          chainName: 'Ethereum',
          shortName: 'ETH',
        },
        name: 'Ethereum Token',
      };

      mockUseCryptoCurrenciesValues = {
        ...mockUseCryptoCurrenciesInitialValues,
        cryptoCurrencies: [mockCryptoCurrenciesData[0], mockEthereumToken],
      };

      render(BuildQuote);

      fireEvent.press(getByRoleButton(mockCryptoCurrenciesData[0].name));
      await act(async () => {
        fireEvent.press(getByRoleButton('Ethereum Token'));
      });

      expect(mockSetActiveNetwork).not.toHaveBeenCalled();
      expect(mockSetSelectedAsset).toHaveBeenCalledWith(mockEthereumToken);
    });
  });

  describe('Payment Method Data', () => {
    it('renders the loading page when payment methods are loading', async () => {
      mockUsePaymentMethodsValues = {
        ...mockUsePaymentMethodsInitialValues,
        isFetching: true,
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders no icons if there are no payment methods', async () => {
      mockUsePaymentMethodsValues = {
        ...mockUsePaymentMethodsInitialValues,
        data: null,
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders an error page when there is a payment method error', async () => {
      mockUsePaymentMethodsValues = {
        ...mockUsePaymentMethodsInitialValues,
        error: 'Test error',
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('queries for payment methods when error CTA is clicked', async () => {
      mockUsePaymentMethodsValues = {
        ...mockUsePaymentMethodsInitialValues,
        error: 'Test error',
      };
      render(BuildQuote);
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(mockQueryGetPaymentMethods).toBeCalledTimes(1);
    });

    it('calls setSelectedPaymentMethodId when selecting a payment method', async () => {
      render(BuildQuote);
      fireEvent.press(getByRoleButton(mockPaymentMethods[0].name));
      fireEvent.press(getByRoleButton(mockPaymentMethods[1].name));
      expect(mockSetSelectedPaymentMethodId).toHaveBeenCalledWith(
        mockPaymentMethods[1]?.id,
      );
    });
  });

  describe('Fiat Currency Data', () => {
    it('renders the loading page when fiats are loading', async () => {
      mockUseFiatCurrenciesValues = {
        ...mockUseFiatCurrenciesInitialValues,
        isFetchingFiatCurrency: true,
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders an error page when there is a fiat error', async () => {
      mockUseFiatCurrenciesValues = {
        ...mockUseFiatCurrenciesInitialValues,
        errorFiatCurrency: 'Test error',
      };
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('queries for fiats when error CTA is clicked', async () => {
      mockUseFiatCurrenciesValues = {
        ...mockUseFiatCurrenciesInitialValues,
        errorFiatCurrency: 'Test error',
      };
      render(BuildQuote);
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(mockGetFiatCurrencies).toBeCalledTimes(1);
    });

    it('calls setSelectedFiatCurrencyId when selecting a new fiat', async () => {
      render(BuildQuote);
      fireEvent.press(getByRoleButton(mockFiatCurrenciesData[0].symbol));
      fireEvent.press(getByRoleButton(mockFiatCurrenciesData[1].symbol));
      expect(mockSetSelectedFiatCurrencyId).toHaveBeenCalledWith(
        mockFiatCurrenciesData[1]?.id,
      );
    });
  });

  describe('Amount to buy input', () => {
    it('updates the amount input', async () => {
      render(BuildQuote);
      const initialAmount = '0';
      const validAmount = VALID_AMOUNT.toString();
      const symbol =
        mockUseFiatCurrenciesValues.currentFiatCurrency?.denomSymbol;
      fireEvent.press(getByRoleButton(`${symbol}${initialAmount}`));
      fireEvent.press(getByRoleButton(validAmount));
      expect(getByRoleButton(`${symbol}${validAmount}`)).toBeTruthy();
    });

    it('updates the amount input with quick amount buttons', async () => {
      render(BuildQuote);
      const initialAmount = '0';
      const quickAmount =
        mockUseLimitsInitialValues?.limits?.quickAmounts?.[0].toString();
      const symbol =
        mockUseFiatCurrenciesValues.currentFiatCurrency?.denomSymbol;
      fireEvent.press(getByRoleButton(`${symbol}${initialAmount}`));
      fireEvent.press(getByRoleButton(`${symbol}${quickAmount}`));
      expect(
        screen.queryAllByRole('button', { name: `${symbol}${quickAmount}` }),
      ).toHaveLength(2);
    });

    it('validates the max limit', () => {
      render(BuildQuote);
      const initialAmount = '0';
      const invalidMaxAmount = (MAX_LIMIT + 1).toString();
      const denomSymbol =
        mockUseFiatCurrenciesValues.currentFiatCurrency?.denomSymbol;
      fireEvent.press(getByRoleButton(`${denomSymbol}${initialAmount}`));
      fireEvent.press(getByRoleButton(invalidMaxAmount));
      expect(
        screen.getByText(`Maximum deposit is ${denomSymbol}${MAX_LIMIT}`),
      ).toBeTruthy();
    });

    it('validates the min limit', () => {
      render(BuildQuote);
      const initialAmount = '0';
      const invalidMinAmount = (MIN_LIMIT - 1).toString();
      const denomSymbol =
        mockUseFiatCurrenciesValues.currentFiatCurrency?.denomSymbol;
      fireEvent.press(getByRoleButton(`${denomSymbol}${initialAmount}`));
      fireEvent.press(getByRoleButton(invalidMinAmount));
      expect(
        screen.getByText(`Minimum deposit is ${denomSymbol}${MIN_LIMIT}`),
      ).toBeTruthy();
    });
  });

  describe('Amount to sell input', () => {
    beforeEach(() => {
      mockUseRampSDKValues.isBuy = false;
      mockUseRampSDKValues.isSell = true;
    });

    it('updates the amount input', async () => {
      render(BuildQuote);
      const initialAmount = '0';
      const validAmount = VALID_AMOUNT.toString();
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      fireEvent.press(getByRoleButton(validAmount));
      expect(getByRoleButton(`${validAmount} ${symbol}`)).toBeTruthy();
    });

    it('validates the max limit', () => {
      render(BuildQuote);
      const initialAmount = '0';
      const invalidMaxAmount = (MAX_LIMIT + 1).toString();
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      fireEvent.press(getByRoleButton(invalidMaxAmount));
      expect(
        screen.getByText('Enter a smaller amount to continue'),
      ).toBeTruthy();
    });

    it('validates the min limit', () => {
      render(BuildQuote);
      const initialAmount = '0';
      const invalidMinAmount = (MIN_LIMIT - 1).toString();
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      fireEvent.press(getByRoleButton(invalidMinAmount));
      expect(
        screen.getByText('Enter a larger amount to continue'),
      ).toBeTruthy();
    });

    it('validates the insufficient balance', () => {
      mockUseLimitsValues.limits = {
        ...mockUseLimitsValues.limits,
        maxAmount: 10,
      } as Limits;

      mockUseBalanceValues.balanceBN = toTokenMinimalUnit(
        '5',
        mockUseRampSDKValues.selectedAsset?.decimals || 18,
      ) as BN4;
      render(BuildQuote);
      const initialAmount = '0';
      const overBalanceAmout = '6';
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      fireEvent.press(getByRoleButton(overBalanceAmout));
      expect(
        screen.getByText('This amount is higher than your balance'),
      ).toBeTruthy();
    });

    it('does not show insufficient balance error when amount is 0', () => {
      mockUseLimitsValues.limits = {
        ...mockUseLimitsValues.limits,
        maxAmount: 10,
      } as Limits;

      mockUseBalanceValues.balanceBN = toTokenMinimalUnit(
        '0',
        mockUseRampSDKValues.selectedAsset?.decimals || 18,
      ) as BN4;
      render(BuildQuote);
      const initialAmount = '0';
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      expect(
        screen.queryByText('This amount is higher than your balance'),
      ).toBeNull();
    });

    it('updates the amount input with quick amount buttons', async () => {
      render(BuildQuote);
      const initialAmount = '0';

      mockUseBalanceValues.balanceBN = toTokenMinimalUnit(
        '1',
        mockUseRampSDKValues.selectedAsset?.decimals || 18,
      ) as BN4;
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      fireEvent.press(getByRoleButton('25%'));
      expect(getByRoleButton(`0.25 ${symbol}`)).toBeTruthy();

      fireEvent.press(getByRoleButton(`0.25 ${symbol}`));
      fireEvent.press(getByRoleButton('MAX'));
      expect(getByRoleButton(`1 ${symbol}`)).toBeTruthy();
    });

    it('updates the amount input up to the max considering gas for native asset', async () => {
      render(BuildQuote);
      const initialAmount = '0';
      const quickAmount = 'MAX';
      mockUseRampSDKValues = {
        ...mockUseRampSDKInitialValues,
        isBuy: false,
        isSell: true,
        selectedAsset: {
          ...mockCryptoCurrenciesData[0],
          address: NATIVE_ADDRESS,
        },
      };

      mockUseBalanceValues = {
        balance: '1',
        balanceFiat: '$1.00',
        balanceBN: toTokenMinimalUnit(
          '1',
          mockUseRampSDKValues.selectedAsset?.decimals || 18,
        ) as BN4,
      };
      mockUseGasPriceEstimationValue = {
        estimatedGasFee: toTokenMinimalUnit(
          '0.27',
          mockUseRampSDKValues.selectedAsset?.decimals || 18,
        ) as BN4,
      };
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      fireEvent.press(getByRoleButton(quickAmount));
      expect(getByRoleButton(`0.73 ${symbol}`)).toBeTruthy();
    });

    it('updates the amount input up to the percentage considering gas', async () => {
      render(BuildQuote);
      const initialAmount = '0';
      mockUseRampSDKValues = {
        ...mockUseRampSDKInitialValues,
        isBuy: false,
        isSell: true,
        selectedAsset: {
          ...mockCryptoCurrenciesData[0],
          address: NATIVE_ADDRESS,
        },
      };

      mockUseBalanceValues = {
        balance: '1',
        balanceFiat: '$1.00',
        balanceBN: toTokenMinimalUnit(
          '1',
          mockUseRampSDKValues.selectedAsset?.decimals || 18,
        ) as BN4,
      };
      mockUseGasPriceEstimationValue = {
        estimatedGasFee: toTokenMinimalUnit(
          '0.27',
          mockUseRampSDKValues.selectedAsset?.decimals || 18,
        ) as BN4,
      };
      const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
      fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
      fireEvent.press(getByRoleButton('75%'));
      expect(getByRoleButton(`0.73 ${symbol}`)).toBeTruthy();

      fireEvent.press(getByRoleButton(`0.73 ${symbol}`));
      fireEvent.press(getByRoleButton('50%'));
      expect(getByRoleButton(`0.5 ${symbol}`)).toBeTruthy();
    });
  });

  //
  // SUBMIT BUTTON TEST
  //
  it('Directs the user to the quotes page with correct parameters', () => {
    render(BuildQuote);

    const submitBtn = getByRoleButton('Get quotes');
    expect(submitBtn).toBeTruthy();
    expect(submitBtn.props.disabled).toBe(true);

    const initialAmount = '0';
    const validAmount = VALID_AMOUNT.toString();
    const denomSymbol =
      mockUseFiatCurrenciesValues.currentFiatCurrency?.denomSymbol;
    fireEvent.press(getByRoleButton(`${denomSymbol}${initialAmount}`));
    fireEvent.press(getByRoleButton(validAmount));
    fireEvent.press(getByRoleButton('Done'));
    expect(submitBtn.props.disabled).toBe(false);

    fireEvent.press(submitBtn);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.QUOTES, {
      amount: VALID_AMOUNT,
      asset: mockUseRampSDKValues.selectedAsset,
      fiatCurrency: mockUseFiatCurrenciesValues.currentFiatCurrency,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_QUOTES_REQUESTED', {
      amount: VALID_AMOUNT,
      currency_source: mockUseFiatCurrenciesValues?.currentFiatCurrency?.symbol,
      currency_destination: mockUseRampSDKValues?.selectedAsset?.symbol,
      payment_method_id: mockUsePaymentMethodsValues.currentPaymentMethod?.id,
      chain_id_destination: '1',
      location: 'Amount to Buy Screen',
    });

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.RampQuoteLoading,
      tags: {
        rampType: RampType.BUY,
      },
    });
  });

  it('Directs the user to the sell quotes page with correct parameters', () => {
    mockUseRampSDKValues.rampType = RampType.SELL;
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    render(BuildQuote);

    const submitBtn = getByRoleButton('Get quotes');
    expect(submitBtn).toBeTruthy();
    expect(submitBtn.props.disabled).toBe(true);

    const initialAmount = '0';
    const validAmount = VALID_AMOUNT.toString();
    const symbol = mockUseRampSDKValues.selectedAsset?.symbol;
    fireEvent.press(getByRoleButton(`${initialAmount} ${symbol}`));
    fireEvent.press(getByRoleButton(validAmount));
    fireEvent.press(getByRoleButton('Done'));
    expect(submitBtn.props.disabled).toBe(false);

    fireEvent.press(submitBtn);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.QUOTES, {
      amount: validAmount,
      asset: mockUseRampSDKValues.selectedAsset,
      fiatCurrency: mockUseFiatCurrenciesValues.currentFiatCurrency,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith('OFFRAMP_QUOTES_REQUESTED', {
      amount: VALID_AMOUNT,
      currency_source: mockUseRampSDKValues?.selectedAsset?.symbol,
      currency_destination:
        mockUseFiatCurrenciesValues?.currentFiatCurrency?.symbol,
      payment_method_id: mockUsePaymentMethodsValues.currentPaymentMethod?.id,
      chain_id_source: '1',
      location: 'Amount to Sell Screen',
    });

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.RampQuoteLoading,
      tags: {
        rampType: RampType.SELL,
      },
    });
  });
});
