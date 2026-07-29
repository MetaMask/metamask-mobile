import React from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import {
  type Country,
  type PaymentMethod,
  type Provider,
  type RampsToken,
  type UserRegion,
} from '@metamask/ramps-controller';

import HeadlessPlayground, {
  HEADLESS_PLAYGROUND_AMOUNT_INPUT_TEST_ID,
  HEADLESS_PLAYGROUND_BACK_BUTTON_TEST_ID,
  HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID,
  HEADLESS_PLAYGROUND_EVENT_LOG_TEST_ID,
  HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID,
  HEADLESS_PLAYGROUND_HEADER_TEST_ID,
  HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID,
  HEADLESS_PLAYGROUND_QUOTES_SECTION_TEST_ID,
  HEADLESS_PLAYGROUND_RESET_ASSET_TEST_ID,
  HEADLESS_PLAYGROUND_RESET_PAYMENT_METHOD_TEST_ID,
  HEADLESS_PLAYGROUND_RESET_PROVIDER_TEST_ID,
  HEADLESS_PLAYGROUND_START_BUTTON_SPINNER_TEST_ID,
  HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID,
  HEADLESS_PLAYGROUND_SUMMARY_DIVIDER_TEST_ID,
  HEADLESS_PLAYGROUND_SUMMARY_TEST_ID,
  HEADLESS_SIM_ASSET_ID,
  HEADLESS_SIM_PAYMENT_METHOD_ID,
  HEADLESS_SIM_PROVIDER_ID,
} from './HeadlessPlayground';
import useRampsController from '../../hooks/useRampsController';
import { useHeadlessBuy } from '../../headless';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';

function openPicker(testID: string) {
  fireEvent.press(screen.getByTestId(testID));
}

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.HEADLESS_PLAYGROUND,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: jest.fn(),
    }),
  };
});

const mockUserRegion: UserRegion = {
  country: {
    isoCode: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phone: { prefix: '', placeholder: '', template: '' },
    currency: 'EUR',
    supported: { buy: true, sell: true },
  },
  state: null,
  regionCode: 'fr',
};

const mockProviders = [
  { id: 'provider-1', name: 'Provider One' },
  { id: 'provider-2', name: 'Provider Two' },
] as unknown as Provider[];

const mockTokens = [
  { assetId: 'eip155:1/erc20:0xabc', symbol: 'USDC', name: 'USD Coin' },
  { assetId: 'eip155:1/slip44:60', symbol: 'ETH', name: 'Ether' },
] as unknown as RampsToken[];

const mockPaymentMethods = [
  { id: '/payments/debit-credit-card', name: 'Debit / Credit Card' },
  { id: '/payments/bank-transfer', name: 'Bank transfer' },
] as unknown as PaymentMethod[];

const mockCountries = [
  { isoCode: 'US', name: 'United States', flag: '🇺🇸' },
  { isoCode: 'FR', name: 'France', flag: '🇫🇷' },
] as unknown as Country[];

const mockSetSelectedProvider = jest.fn();
const mockSetSelectedToken = jest.fn();
const mockSetSelectedPaymentMethod = jest.fn();
const mockSetUserRegion = jest.fn().mockResolvedValue(null);
const mockGetQuotes = jest.fn();
const mockGetOrderById = jest.fn();
const mockSessionCancel = jest.fn();
const mockStartHeadlessBuy = jest.fn();

const mockUseRampsControllerInitialValues: ReturnType<
  typeof useRampsController
> = {
  userRegion: mockUserRegion,
  setUserRegion: mockSetUserRegion,
  selectedProvider: null,
  setSelectedProvider: mockSetSelectedProvider,
  providers: mockProviders,
  providersLoading: false,
  providersError: null,
  tokens: { topTokens: mockTokens, allTokens: mockTokens },
  selectedToken: null,
  setSelectedToken: mockSetSelectedToken,
  tokensLoading: false,
  tokensError: null,
  countries: mockCountries,
  countriesLoading: false,
  countriesError: null,
  paymentMethods: mockPaymentMethods,
  selectedPaymentMethod: null,
  setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
  paymentMethodsLoading: false,
  paymentMethodsError: null,
  paymentMethodsFetching: false,
  paymentMethodsStatus: 'idle' as const,
  getQuotes: jest.fn(),
  getBuyWidgetData: jest.fn(),
  orders: [],
  getOrderById: mockGetOrderById,
  addOrder: jest.fn(),
  addPrecreatedOrder: jest.fn(),
  removeOrder: jest.fn(),
  refreshOrder: jest.fn(),
  getOrderFromCallback: jest.fn(),
};

let mockUseRampsControllerValues = mockUseRampsControllerInitialValues;

const mockUseHeadlessBuyInitialValues: ReturnType<typeof useHeadlessBuy> = {
  userRegion: mockUserRegion,
  providers: mockProviders,
  paymentMethods: mockPaymentMethods,
  countries: mockCountries,
  tokens: { topTokens: mockTokens, allTokens: mockTokens },
  orders: [],
  getOrderById: mockGetOrderById,
  getQuotes: mockGetQuotes,
  startHeadlessBuy: mockStartHeadlessBuy,
  isLoading: false,
  errors: {
    tokens: null,
    providers: null,
    paymentMethods: null,
    countries: null,
  },
};

let mockUseHeadlessBuyValues = mockUseHeadlessBuyInitialValues;

jest.mock('../../hooks/useRampsController', () =>
  jest.fn(() => mockUseRampsControllerValues),
);

jest.mock('../../headless', () => {
  const actual = jest.requireActual('../../headless');
  return {
    ...actual,
    useHeadlessBuy: jest.fn(() => mockUseHeadlessBuyValues),
  };
});

describe('HeadlessPlayground', () => {
  beforeEach(() => {
    mockUseRampsControllerValues = mockUseRampsControllerInitialValues;
    mockUseHeadlessBuyValues = mockUseHeadlessBuyInitialValues;
    mockSessionCancel.mockReset();
    mockStartHeadlessBuy.mockReset();
    mockStartHeadlessBuy.mockImplementation(() => ({
      sessionId: 'sess-1',
      cancel: mockSessionCancel,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header with the playground title', () => {
    render(HeadlessPlayground);
    expect(
      screen.getByTestId(HEADLESS_PLAYGROUND_HEADER_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.getByText('Headless Buy playground')).toBeOnTheScreen();
  });

  it('navigates back when the header back button is pressed', () => {
    render(HeadlessPlayground);
    fireEvent.press(
      screen.getByTestId(HEADLESS_PLAYGROUND_BACK_BUTTON_TEST_ID),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  describe('Current setup section', () => {
    it('renders the current setup card by default', () => {
      render(HeadlessPlayground);
      expect(screen.getByText('Current setup')).toBeOnTheScreen();
      expect(screen.getByText('User region')).toBeOnTheScreen();
      expect(screen.getAllByText('fr').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the configure section', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
        selectedToken: mockTokens[0],
        selectedPaymentMethod: mockPaymentMethods[0],
      };
      render(HeadlessPlayground);
      expect(screen.getByText('Configure')).toBeOnTheScreen();
      expect(
        screen.getByTestId('headless-playground-config-provider'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('headless-playground-config-token'),
      ).toBeOnTheScreen();
    });

    it('shows "None selected" placeholders when nothing is selected', () => {
      render(HeadlessPlayground);
      expect(
        screen.getAllByText('None selected').length,
      ).toBeGreaterThanOrEqual(3);
    });

    it('renders the selected provider, token and payment method when present', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
        selectedToken: mockTokens[0],
        selectedPaymentMethod: mockPaymentMethods[0],
      };
      render(HeadlessPlayground);
      expect(
        screen.getAllByText('Provider One (provider-1)').length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText('USDC — eip155:1/erc20:0xabc').length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText('Debit / Credit Card (/payments/debit-credit-card)')
          .length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders the no_data fallback when there is no user region', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        userRegion: null,
      };
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        userRegion: null,
      };
      render(HeadlessPlayground);
      expect(screen.getAllByText('No data').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Configure pickers', () => {
    it('renders provider, token, payment method and countries rows with item counts', () => {
      render(HeadlessPlayground);
      expect(screen.getByText('Providers')).toBeOnTheScreen();
      expect(screen.getByText('Tokens')).toBeOnTheScreen();
      expect(screen.getByText('Payment methods')).toBeOnTheScreen();
      expect(screen.getByText('Countries')).toBeOnTheScreen();
      expect(screen.getAllByText('2 item(s)').length).toBeGreaterThanOrEqual(4);

      expect(
        screen.queryByText('Provider One (provider-1)'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText('USDC — eip155:1/erc20:0xabc'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText('Debit / Credit Card (/payments/debit-credit-card)'),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText(/United States/)).not.toBeOnTheScreen();
    });

    it('reveals provider items when the providers row is pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-provider');
      expect(screen.getByText('Provider One (provider-1)')).toBeOnTheScreen();
      expect(screen.getByText('Provider Two (provider-2)')).toBeOnTheScreen();
    });

    it('reveals token items when the tokens row is pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-token');
      expect(screen.getByText('USDC — eip155:1/erc20:0xabc')).toBeOnTheScreen();
    });

    it('reveals payment method items when the payment methods row is pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-payment-method');
      expect(
        screen.getAllByText('Debit / Credit Card (/payments/debit-credit-card)')
          .length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('reveals country items when the countries row is pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-country');
      expect(screen.getByText('🇺🇸 United States (US)')).toBeOnTheScreen();
    });

    it('renders the loading status when data is loading', () => {
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        isLoading: true,
      };
      render(HeadlessPlayground);
      expect(screen.getAllByText('Loading…').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the error status when a section has an error', () => {
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        errors: {
          tokens: null,
          providers: 'Boom',
          paymentMethods: null,
          countries: null,
        },
      };
      render(HeadlessPlayground);
      expect(screen.getByText('Error: Boom')).toBeOnTheScreen();
    });
  });

  describe('Selecting a provider', () => {
    it('calls setSelectedProvider with the chosen provider when pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-provider');
      fireEvent.press(
        screen.getByTestId('headless-playground-provider-provider-1'),
      );
      expect(mockSetSelectedProvider).toHaveBeenCalledWith(mockProviders[0]);
    });

    it('calls setSelectedProvider with null when the already-selected provider is pressed', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
      };
      render(HeadlessPlayground);
      openPicker('headless-playground-config-provider');
      fireEvent.press(
        screen.getByTestId('headless-playground-provider-provider-1'),
      );
      expect(mockSetSelectedProvider).toHaveBeenCalledWith(null);
    });

    it('marks the selected provider row as selected via accessibility state', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
      };
      render(HeadlessPlayground);
      openPicker('headless-playground-config-provider');
      const selectedRow = screen.getByTestId(
        'headless-playground-provider-provider-1',
      );
      const unselectedRow = screen.getByTestId(
        'headless-playground-provider-provider-2',
      );
      expect(selectedRow.props.accessibilityState).toEqual({ selected: true });
      expect(unselectedRow.props.accessibilityState).toEqual({
        selected: false,
      });
    });
  });

  describe('Selecting a token', () => {
    it('calls setSelectedToken with the asset id when a token row is pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-token');
      fireEvent.press(
        screen.getByTestId('headless-playground-token-eip155:1/erc20:0xabc'),
      );
      expect(mockSetSelectedToken).toHaveBeenCalledWith('eip155:1/erc20:0xabc');
    });

    it('marks the selected token row as selected via accessibility state', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: mockTokens[0],
      };
      render(HeadlessPlayground);
      openPicker('headless-playground-config-token');
      const selectedRow = screen.getByTestId(
        'headless-playground-token-eip155:1/erc20:0xabc',
      );
      expect(selectedRow.props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('Selecting a payment method', () => {
    it('calls setSelectedPaymentMethod when a payment method row is pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-payment-method');
      fireEvent.press(
        screen.getByTestId(
          'headless-playground-payment-method-/payments/debit-credit-card',
        ),
      );
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(
        mockPaymentMethods[0],
      );
    });

    it('toggles the payment method off when the already-selected one is pressed', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedPaymentMethod: mockPaymentMethods[0],
      };
      render(HeadlessPlayground);
      openPicker('headless-playground-config-payment-method');
      fireEvent.press(
        screen.getByTestId(
          'headless-playground-payment-method-/payments/debit-credit-card',
        ),
      );
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(null);
    });
  });

  describe('Selecting a country', () => {
    it('calls setUserRegion with the lowercased iso code when a country row is pressed', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-country');
      fireEvent.press(screen.getByTestId('headless-playground-country-US'));
      expect(mockSetUserRegion).toHaveBeenCalledWith('us');
    });

    it('marks the currently active region as selected via accessibility state', () => {
      render(HeadlessPlayground);
      openPicker('headless-playground-config-country');
      const activeRow = screen.getByTestId('headless-playground-country-FR');
      expect(activeRow.props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('Current setup summary', () => {
    it('renders the divider and current setup container', () => {
      render(HeadlessPlayground);
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_DIVIDER_TEST_ID),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_TEST_ID),
      ).toBeOnTheScreen();
      expect(screen.getByText('Current setup')).toBeOnTheScreen();
    });

    it('shows "None selected" for unselected rows', () => {
      render(HeadlessPlayground);
      const summary = screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_TEST_ID);
      const noneSelectedRows = within(summary).getAllByText('None selected');
      expect(noneSelectedRows.length).toBe(3);
    });

    it('renders the selected token and provider values', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
        selectedToken: mockTokens[0],
      };
      render(HeadlessPlayground);
      const summary = screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_TEST_ID);
      expect(
        within(summary).getByText('USDC — eip155:1/erc20:0xabc'),
      ).toBeOnTheScreen();
      expect(
        within(summary).getByText('Provider One (provider-1)'),
      ).toBeOnTheScreen();
    });

    it('reflects whichever provider is currently selected in the controller', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[1],
      };
      render(HeadlessPlayground);
      const summary = screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_TEST_ID);
      expect(
        within(summary).getByText('Provider Two (provider-2)'),
      ).toBeOnTheScreen();
    });
  });

  describe('Default selections', () => {
    const transakProvider = {
      id: '/providers/transak-native',
      name: 'Transak',
    } as unknown as Provider;
    const musdLineaToken = {
      assetId: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      symbol: 'mUSD',
      name: 'MetaMask USD',
    } as unknown as RampsToken;

    it('selects the mUSD on Linea token by default when available and nothing is selected', () => {
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        tokens: {
          topTokens: [musdLineaToken, ...mockTokens],
          allTokens: [musdLineaToken, ...mockTokens],
        },
      };
      render(HeadlessPlayground);
      expect(mockSetSelectedToken).toHaveBeenCalledWith(musdLineaToken.assetId);
    });

    it('matches the mUSD on Linea token case-insensitively', () => {
      const checksummedToken = {
        ...musdLineaToken,
        assetId:
          'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      } as unknown as RampsToken;
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        tokens: {
          topTokens: [checksummedToken],
          allTokens: [checksummedToken],
        },
      };
      render(HeadlessPlayground);
      expect(mockSetSelectedToken).toHaveBeenCalledWith(
        checksummedToken.assetId,
      );
    });

    it('selects the transak-native provider by default when available and nothing is selected', () => {
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        providers: [...mockProviders, transakProvider],
      };
      render(HeadlessPlayground);
      expect(mockSetSelectedProvider).toHaveBeenCalledWith(transakProvider);
    });

    it('does not override an already selected token', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: mockTokens[0],
      };
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        tokens: {
          topTokens: [musdLineaToken, ...mockTokens],
          allTokens: [musdLineaToken, ...mockTokens],
        },
      };
      render(HeadlessPlayground);
      expect(mockSetSelectedToken).not.toHaveBeenCalled();
    });

    it('does not override an already selected provider', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
      };
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        providers: [...mockProviders, transakProvider],
      };
      render(HeadlessPlayground);
      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('does not call setSelectedToken when the default token is not available', () => {
      render(HeadlessPlayground);
      expect(mockSetSelectedToken).not.toHaveBeenCalled();
    });

    it('does not call setSelectedProvider when the default provider is not available', () => {
      render(HeadlessPlayground);
      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('does not attempt to select defaults while data is loading', () => {
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        isLoading: true,
        tokens: {
          topTokens: [musdLineaToken],
          allTokens: [musdLineaToken],
        },
        providers: [transakProvider],
      };
      render(HeadlessPlayground);
      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });
  });

  describe('Headless consumer simulation section', () => {
    it('renders the headless sandbox container', () => {
      render(HeadlessPlayground);
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID),
      ).toBeOnTheScreen();
      expect(screen.getByText('useHeadlessBuy sandbox')).toBeOnTheScreen();
      expect(
        screen.getByText(
          /Inputs default to hardcoded sim values\. Pick a different token, payment method, or provider in Configure to override/,
        ),
      ).toBeOnTheScreen();
    });

    it('marks all params as hardcoded by default and shows no Reset links', () => {
      render(HeadlessPlayground);
      const section = screen.getByTestId(
        HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID,
      );
      expect(within(section).getAllByText('Hardcoded default').length).toBe(3);
      expect(within(section).queryByText('Reset')).not.toBeOnTheScreen();
    });

    it('flips the asset row to override and reveals a Reset link when a different token is selected', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: mockTokens[0],
      };
      render(HeadlessPlayground);
      const section = screen.getByTestId(
        HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID,
      );
      expect(within(section).getAllByText('Hardcoded default').length).toBe(2);
      expect(
        within(section).getByText('Override (tap Reset to clear)'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_RESET_ASSET_TEST_ID),
      ).toBeOnTheScreen();
      // Resolved name + raw id from the controller selection.
      expect(
        within(section).getByText(`USDC — ${mockTokens[0].assetId}`),
      ).toBeOnTheScreen();
    });

    it('does NOT mark the asset row as overridden when the selected token equals the hardcoded sim asset', () => {
      const simToken = {
        assetId: HEADLESS_SIM_ASSET_ID,
        symbol: 'mUSD',
        name: 'MetaMask USD',
      } as unknown as RampsToken;
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: simToken,
      };
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        tokens: {
          topTokens: [simToken, ...mockTokens],
          allTokens: [simToken, ...mockTokens],
        },
      };
      render(HeadlessPlayground);
      expect(
        screen.queryByTestId(HEADLESS_PLAYGROUND_RESET_ASSET_TEST_ID),
      ).not.toBeOnTheScreen();
    });

    it('tapping Reset on the asset row re-selects the hardcoded sim asset id', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: mockTokens[0],
      };
      render(HeadlessPlayground);
      fireEvent.press(
        screen.getByTestId(HEADLESS_PLAYGROUND_RESET_ASSET_TEST_ID),
      );
      expect(mockSetSelectedToken).toHaveBeenCalledWith(HEADLESS_SIM_ASSET_ID);
    });

    it('tapping Reset on the payment method row clears the controller selection', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedPaymentMethod: mockPaymentMethods[1],
      };
      render(HeadlessPlayground);
      fireEvent.press(
        screen.getByTestId(HEADLESS_PLAYGROUND_RESET_PAYMENT_METHOD_TEST_ID),
      );
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(null);
    });

    it('tapping Reset on the provider row clears the controller selection', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
      };
      render(HeadlessPlayground);
      fireEvent.press(
        screen.getByTestId(HEADLESS_PLAYGROUND_RESET_PROVIDER_TEST_ID),
      );
      expect(mockSetSelectedProvider).toHaveBeenCalledWith(null);
    });

    it('exposes the hardcoded asset, payment method and provider IDs as labels', () => {
      render(HeadlessPlayground);
      const section = screen.getByTestId(
        HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID,
      );
      expect(within(section).getByText(/Asset ID/)).toBeOnTheScreen();
      expect(
        within(section).getByText(new RegExp(HEADLESS_SIM_ASSET_ID)),
      ).toBeOnTheScreen();
      expect(
        within(section).getByText(new RegExp(HEADLESS_SIM_PAYMENT_METHOD_ID)),
      ).toBeOnTheScreen();
      expect(
        within(section).getByText(new RegExp(HEADLESS_SIM_PROVIDER_ID)),
      ).toBeOnTheScreen();
    });

    it('resolves the hardcoded asset id via useHeadlessBuy when present in the catalog', () => {
      const musdToken = {
        assetId: HEADLESS_SIM_ASSET_ID,
        symbol: 'mUSD',
        name: 'MetaMask USD',
      } as unknown as RampsToken;
      mockUseHeadlessBuyValues = {
        ...mockUseHeadlessBuyInitialValues,
        tokens: {
          topTokens: [musdToken, ...mockTokens],
          allTokens: [musdToken, ...mockTokens],
        },
      };
      render(HeadlessPlayground);
      const section = screen.getByTestId(
        HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID,
      );
      expect(
        within(section).getByText(`mUSD — ${HEADLESS_SIM_ASSET_ID}`),
      ).toBeOnTheScreen();
    });

    it('falls back to the unresolved label when the hardcoded ids are not in the catalog', () => {
      render(HeadlessPlayground);
      const section = screen.getByTestId(
        HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID,
      );
      expect(
        within(section).getAllByText(/Not in catalog yet/).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Quotes panel', () => {
    it('renders the amount input pre-filled with 25', () => {
      render(HeadlessPlayground);
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_AMOUNT_INPUT_TEST_ID).props
          .value,
      ).toBe('25');
    });

    it('enables the get-quotes button by default since selections are hardcoded', () => {
      render(HeadlessPlayground);
      const button = screen.getByTestId(
        HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID,
      );
      expect(button.props.accessibilityState).toMatchObject({
        disabled: false,
      });
    });

    it('disables the get-quotes button when amount is empty or invalid', () => {
      render(HeadlessPlayground);
      fireEvent.changeText(
        screen.getByTestId(HEADLESS_PLAYGROUND_AMOUNT_INPUT_TEST_ID),
        '',
      );
      const button = screen.getByTestId(
        HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID,
      );
      expect(button.props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('does not change selected* state on the controller when get-quotes is pressed', async () => {
      mockGetQuotes.mockResolvedValueOnce({
        success: [],
        sorted: [],
        error: [],
        customActions: [],
      });
      render(HeadlessPlayground);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID),
        );
      });
      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockSetSelectedPaymentMethod).not.toHaveBeenCalled();
      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('calls getQuotes with the hardcoded sim values and the typed amount', async () => {
      mockGetQuotes.mockResolvedValueOnce({
        success: [],
        sorted: [],
        error: [],
        customActions: [],
      });
      render(HeadlessPlayground);
      fireEvent.changeText(
        screen.getByTestId(HEADLESS_PLAYGROUND_AMOUNT_INPUT_TEST_ID),
        '40',
      );
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID),
        );
      });
      expect(mockGetQuotes).toHaveBeenCalledWith({
        assetId: HEADLESS_SIM_ASSET_ID,
        amount: 40,
        paymentMethodIds: [HEADLESS_SIM_PAYMENT_METHOD_ID],
        providerIds: [HEADLESS_SIM_PROVIDER_ID],
      });
    });

    it('uses controller-side selections as overrides for the hardcoded sim values', async () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: mockTokens[0],
        selectedPaymentMethod: mockPaymentMethods[1],
        selectedProvider: mockProviders[0],
      };
      mockGetQuotes.mockResolvedValueOnce({
        success: [],
        sorted: [],
        error: [],
        customActions: [],
      });
      render(HeadlessPlayground);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID),
        );
      });
      expect(mockGetQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: mockTokens[0].assetId,
          paymentMethodIds: [mockPaymentMethods[1].id],
          providerIds: [mockProviders[0].id],
        }),
      );
    });

    it('renders the quote summary count after a successful fetch', async () => {
      mockGetQuotes.mockResolvedValueOnce({
        success: [
          {
            provider: 'Provider One',
            quote: { amountIn: 40, amountOut: 0.01 },
          },
          {
            provider: { name: 'Provider Two' },
            quote: { amountIn: 40, amountOut: 0.011 },
          },
        ],
        sorted: [],
        error: [],
        customActions: [],
      });
      render(HeadlessPlayground);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID),
        );
      });
      await waitFor(() =>
        expect(screen.getByText('Quotes (2 item(s))')).toBeOnTheScreen(),
      );
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_QUOTES_SECTION_TEST_ID),
      ).toBeOnTheScreen();
      expect(screen.getByText('Provider One')).toBeOnTheScreen();
      expect(screen.getByText('Provider Two')).toBeOnTheScreen();
    });

    it('renders payment method, fees, reliability and tag badges per quote', async () => {
      mockGetQuotes.mockResolvedValueOnce({
        success: [
          {
            provider: 'Provider One',
            quote: {
              amountIn: 40,
              amountOut: 0.01,
              paymentMethod: '/payments/debit-credit-card',
              totalFees: 1.5,
              networkFee: 0.4,
              providerFee: 1.1,
            },
            metadata: {
              reliability: 92,
              tags: { isBestRate: true, isMostReliable: true },
            },
          },
          {
            provider: 'Provider Two',
            quote: {
              amountIn: 40,
              amountOut: 0.0098,
              paymentMethod: '/payments/unknown-method',
            },
          },
        ],
        sorted: [],
        error: [],
        customActions: [],
      });
      render(HeadlessPlayground);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID),
        );
      });
      await waitFor(() =>
        expect(screen.getByText('Quotes (2 item(s))')).toBeOnTheScreen(),
      );

      const firstQuote = screen.getByTestId('headless-playground-quote-0');
      // Payment method resolved via the catalog → name + raw id.
      expect(
        within(firstQuote).getByText(
          'Debit / Credit Card (/payments/debit-credit-card)',
        ),
      ).toBeOnTheScreen();
      // Fees broken down using the user region's currency (EUR in mocks).
      expect(within(firstQuote).getByText(/1\.5 EUR total/)).toBeOnTheScreen();
      expect(
        within(firstQuote).getByText(
          /\(network 0\.4 EUR \+ provider 1\.1 EUR\)/,
        ),
      ).toBeOnTheScreen();
      // Reliability score and badges.
      expect(within(firstQuote).getByText('92/100')).toBeOnTheScreen();
      expect(within(firstQuote).getByText('Best rate')).toBeOnTheScreen();
      expect(within(firstQuote).getByText('Most reliable')).toBeOnTheScreen();

      // Quote without a catalog match falls back to showing the raw id.
      const secondQuote = screen.getByTestId('headless-playground-quote-1');
      expect(
        within(secondQuote).getByText('/payments/unknown-method'),
      ).toBeOnTheScreen();
      expect(
        within(secondQuote).queryByText('Best rate'),
      ).not.toBeOnTheScreen();
    });

    it('renders the error message when getQuotes rejects', async () => {
      mockGetQuotes.mockRejectedValueOnce(new Error('boom'));
      render(HeadlessPlayground);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID),
        );
      });
      await waitFor(() =>
        expect(screen.getByText('Quotes (Error: boom)')).toBeOnTheScreen(),
      );
    });

    it('renders an idle hint while no quotes have been fetched', () => {
      render(HeadlessPlayground);
      expect(
        screen.getByText('Quotes (Press "Get quotes" to fetch)'),
      ).toBeOnTheScreen();
    });
  });

  describe('Headless session lifecycle (per-quote start)', () => {
    const sampleQuotes = [
      {
        provider: '/providers/transak-native',
        quote: {
          amountIn: 25,
          amountOut: 0.01,
          paymentMethod: '/payments/debit-credit-card',
        },
        providerInfo: {
          id: '/providers/transak-native',
          name: 'Transak',
          type: 'native' as const,
        },
      },
      {
        provider: '/providers/moonpay',
        quote: {
          amountIn: 25,
          amountOut: 0.0098,
          paymentMethod: '/payments/debit-credit-card',
        },
        providerInfo: {
          id: '/providers/moonpay',
          name: 'MoonPay',
          type: 'aggregator' as const,
        },
      },
    ];

    async function renderWithQuotes(quotes: unknown[] = sampleQuotes) {
      mockGetQuotes.mockResolvedValueOnce({
        success: quotes,
        sorted: [],
        error: [],
        customActions: [],
      });
      render(HeadlessPlayground);
      await act(async () => {
        fireEvent.press(
          screen.getByTestId(HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID),
        );
      });
    }

    it('renders one start button per quote and an empty event log', async () => {
      await renderWithQuotes();
      expect(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-1`),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_EVENT_LOG_TEST_ID),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID),
      ).not.toBeOnTheScreen();
    });

    it('disables every per-quote start button when the amount is empty', async () => {
      await renderWithQuotes();
      fireEvent.changeText(
        screen.getByTestId(HEADLESS_PLAYGROUND_AMOUNT_INPUT_TEST_ID),
        '',
      );
      expect(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      ).toBeDisabled();
      expect(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-1`),
      ).toBeDisabled();
    });

    it('calls startHeadlessBuy with the chosen quote and the playground asset/amount/currency', async () => {
      await renderWithQuotes();
      fireEvent.press(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      );
      expect(mockStartHeadlessBuy).toHaveBeenCalledTimes(1);
      const [params, callbacks] = mockStartHeadlessBuy.mock.calls[0];
      expect(params).toEqual({
        quote: sampleQuotes[0],
        assetId: HEADLESS_SIM_ASSET_ID,
        amount: 25,
        currency: mockUserRegion.country?.currency,
        // Playground sandbox passes a default money_account surface (TRAM-3623).
        rampSurface: 'money_account',
      });
      expect(typeof callbacks.onOrderCreated).toBe('function');
      expect(typeof callbacks.onError).toBe('function');
      expect(typeof callbacks.onClose).toBe('function');
    });

    it('uses the controller-side selected token (when overridden) as the assetId param', async () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: mockTokens[0],
        selectedPaymentMethod: mockPaymentMethods[1],
        selectedProvider: mockProviders[0],
      };
      await renderWithQuotes();
      fireEvent.press(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-1`),
      );
      expect(mockStartHeadlessBuy).toHaveBeenCalledWith(
        expect.objectContaining({
          quote: sampleQuotes[1],
          assetId: mockTokens[0].assetId,
          amount: 25,
        }),
        expect.any(Object),
      );
    });

    it('shows the cancel affordance after starting a session', async () => {
      await renderWithQuotes();
      fireEvent.press(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      );
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID),
      ).toBeOnTheScreen();
    });

    it('shows a loading spinner inside the quote button that started the session', async () => {
      await renderWithQuotes();
      fireEvent.press(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      );
      expect(
        screen.getByTestId(
          `${HEADLESS_PLAYGROUND_START_BUTTON_SPINNER_TEST_ID}-0`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          `${HEADLESS_PLAYGROUND_START_BUTTON_SPINNER_TEST_ID}-1`,
        ),
      ).not.toBeOnTheScreen();
    });

    it('appends a started entry to the event log including the session id', async () => {
      await renderWithQuotes();
      fireEvent.press(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      );
      const eventLog = screen.getByTestId(
        HEADLESS_PLAYGROUND_EVENT_LOG_TEST_ID,
      );
      expect(within(eventLog).getByText(/sess-1/)).toBeOnTheScreen();
    });

    it('cancel calls the session cancel handle and hides the cancel affordance', async () => {
      await renderWithQuotes();
      fireEvent.press(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      );
      fireEvent.press(
        screen.getByTestId(HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID),
      );
      expect(mockSessionCancel).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID),
      ).not.toBeOnTheScreen();
    });

    it('logs onOrderCreated callback events fired by the consumer', async () => {
      await renderWithQuotes();
      fireEvent.press(
        screen.getByTestId(`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-0`),
      );
      const callbacks = mockStartHeadlessBuy.mock.calls[0][1] as {
        onOrderCreated: (orderId: string) => void;
      };
      act(() => {
        callbacks.onOrderCreated('order-xyz');
      });
      const eventLog = screen.getByTestId(
        HEADLESS_PLAYGROUND_EVENT_LOG_TEST_ID,
      );
      expect(
        within(eventLog).getByText(/onOrderCreated → order-xyz/),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID),
      ).not.toBeOnTheScreen();
    });
  });
});
