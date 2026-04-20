import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react-native';
import {
  type PaymentMethod,
  type Provider,
  type RampsToken,
  type UserRegion,
} from '@metamask/ramps-controller';

import HeadlessPlayground, {
  HEADLESS_PLAYGROUND_BACK_BUTTON_TEST_ID,
  HEADLESS_PLAYGROUND_HEADER_TEST_ID,
  HEADLESS_PLAYGROUND_SUMMARY_DIVIDER_TEST_ID,
  HEADLESS_PLAYGROUND_SUMMARY_TEST_ID,
  HeadlessPlaygroundAccordionIndex,
} from './HeadlessPlayground';

const ACCORDION_HEADER_TEST_ID = 'accordionheader';

function pressAccordion(index: HeadlessPlaygroundAccordionIndex) {
  fireEvent.press(screen.getAllByTestId(ACCORDION_HEADER_TEST_ID)[index]);
}
import useRampsController from '../../hooks/useRampsController';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';

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
  {
    id: 'provider-1',
    name: 'Provider One',
  },
  {
    id: 'provider-2',
    name: 'Provider Two',
  },
] as unknown as Provider[];

const mockTokens = [
  {
    assetId: 'eip155:1/erc20:0xabc',
    symbol: 'USDC',
    name: 'USD Coin',
  },
  {
    assetId: 'eip155:1/slip44:60',
    symbol: 'ETH',
    name: 'Ether',
  },
] as unknown as RampsToken[];

const mockPaymentMethods = [
  {
    id: '/payments/debit-credit-card',
    name: 'Debit / Credit Card',
  },
  {
    id: '/payments/bank-transfer',
    name: 'Bank transfer',
  },
] as unknown as PaymentMethod[];

const mockSetSelectedProvider = jest.fn();
const mockSetSelectedToken = jest.fn();

const mockUseRampsControllerInitialValues: ReturnType<
  typeof useRampsController
> = {
  userRegion: mockUserRegion,
  setUserRegion: jest.fn(),
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
  countries: [],
  countriesLoading: false,
  countriesError: null,
  paymentMethods: mockPaymentMethods,
  selectedPaymentMethod: null,
  setSelectedPaymentMethod: jest.fn(),
  paymentMethodsLoading: false,
  paymentMethodsError: null,
  paymentMethodsFetching: false,
  paymentMethodsStatus: 'idle' as const,
  getQuotes: jest.fn(),
  getBuyWidgetData: jest.fn(),
  orders: [],
  getOrderById: jest.fn(),
  addOrder: jest.fn(),
  addPrecreatedOrder: jest.fn(),
  removeOrder: jest.fn(),
  refreshOrder: jest.fn(),
  getOrderFromCallback: jest.fn(),
};

let mockUseRampsControllerValues = mockUseRampsControllerInitialValues;

jest.mock('../../hooks/useRampsController', () =>
  jest.fn(() => mockUseRampsControllerValues),
);

describe('HeadlessPlayground', () => {
  beforeEach(() => {
    mockUseRampsControllerValues = mockUseRampsControllerInitialValues;
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

  describe('Selected values section', () => {
    it('is expanded by default and shows the user region', () => {
      render(HeadlessPlayground);
      expect(screen.getByText('Selected values (1/4)')).toBeOnTheScreen();
      expect(screen.getByText('User region')).toBeOnTheScreen();
      expect(screen.getByText('fr')).toBeOnTheScreen();
    });

    it('reflects the count of selected items in the title', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
        selectedToken: mockTokens[0],
        selectedPaymentMethod: mockPaymentMethods[0],
      };
      render(HeadlessPlayground);
      expect(screen.getByText('Selected values (4/4)')).toBeOnTheScreen();
    });

    it('can be collapsed', () => {
      render(HeadlessPlayground);
      pressAccordion(HeadlessPlaygroundAccordionIndex.Selected);
      expect(screen.queryByText('User region')).not.toBeOnTheScreen();
    });

    it('shows "None selected" placeholders when nothing is selected', () => {
      render(HeadlessPlayground);
      // 3 unselected rows in the accordion (provider, token, payment method)
      // plus 2 unselected rows in the summary section (token, provider).
      expect(screen.getAllByText('None selected').length).toBe(5);
    });

    it('renders the selected provider, token and payment method when present', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedProvider: mockProviders[0],
        selectedToken: mockTokens[0],
        selectedPaymentMethod: mockPaymentMethods[0],
      };
      render(HeadlessPlayground);
      // Selected provider/token also appear in the summary section, so we
      // assert at least one occurrence rather than a unique match.
      expect(
        screen.getAllByText('Provider One (provider-1)').length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText('USDC — eip155:1/erc20:0xabc').length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText('Debit / Credit Card (/payments/debit-credit-card)'),
      ).toBeOnTheScreen();
    });

    it('renders the no_data fallback when there is no user region', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        userRegion: null,
      };
      render(HeadlessPlayground);
      expect(screen.getByText('No data')).toBeOnTheScreen();
    });
  });

  describe('Data accordions', () => {
    it('renders provider, token and payment method accordions collapsed with item counts', () => {
      render(HeadlessPlayground);
      expect(screen.getByText('Providers (2 item(s))')).toBeOnTheScreen();
      expect(screen.getByText('Tokens (2 item(s))')).toBeOnTheScreen();
      expect(screen.getByText('Payment methods (2 item(s))')).toBeOnTheScreen();

      expect(
        screen.queryByText('Provider One (provider-1)'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText('USDC — eip155:1/erc20:0xabc'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText(
          '• Debit / Credit Card (/payments/debit-credit-card)',
        ),
      ).not.toBeOnTheScreen();
    });

    it('reveals provider items when the providers accordion is expanded', () => {
      render(HeadlessPlayground);
      pressAccordion(HeadlessPlaygroundAccordionIndex.Providers);
      expect(screen.getByText('Provider One (provider-1)')).toBeOnTheScreen();
      expect(screen.getByText('Provider Two (provider-2)')).toBeOnTheScreen();
    });

    it('reveals token items when the tokens accordion is expanded', () => {
      render(HeadlessPlayground);
      pressAccordion(HeadlessPlaygroundAccordionIndex.Tokens);
      expect(screen.getByText('USDC — eip155:1/erc20:0xabc')).toBeOnTheScreen();
    });

    it('reveals payment method items when the payment methods accordion is expanded', () => {
      render(HeadlessPlayground);
      pressAccordion(HeadlessPlaygroundAccordionIndex.PaymentMethods);
      expect(
        screen.getByText('• Debit / Credit Card (/payments/debit-credit-card)'),
      ).toBeOnTheScreen();
    });

    it('renders the loading status in the title when a section is loading', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        providersLoading: true,
      };
      render(HeadlessPlayground);
      expect(screen.getByText('Providers (Loading…)')).toBeOnTheScreen();
    });

    it('renders the error status in the title when a section has an error', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        providersError: 'Boom',
      };
      render(HeadlessPlayground);
      expect(screen.getByText('Providers (Error: Boom)')).toBeOnTheScreen();
    });
  });

  describe('Selecting a provider', () => {
    it('calls setSelectedProvider with the chosen provider when pressed', () => {
      render(HeadlessPlayground);
      pressAccordion(HeadlessPlaygroundAccordionIndex.Providers);
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
      pressAccordion(HeadlessPlaygroundAccordionIndex.Providers);
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
      pressAccordion(HeadlessPlaygroundAccordionIndex.Providers);
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

  describe('Summary section', () => {
    it('renders the divider and summary container', () => {
      render(HeadlessPlayground);
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_DIVIDER_TEST_ID),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_TEST_ID),
      ).toBeOnTheScreen();
      expect(screen.getByText('Summary')).toBeOnTheScreen();
    });

    it('shows "None selected" for both rows when nothing is selected', () => {
      render(HeadlessPlayground);
      const summary = screen.getByTestId(HEADLESS_PLAYGROUND_SUMMARY_TEST_ID);
      const noneSelectedRows = within(summary).getAllByText('None selected');
      expect(noneSelectedRows.length).toBe(2);
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
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
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
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
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
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        providers: [...mockProviders, transakProvider],
      };
      render(HeadlessPlayground);
      expect(mockSetSelectedProvider).toHaveBeenCalledWith(transakProvider);
    });

    it('does not override an already selected token', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        selectedToken: mockTokens[0],
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
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        tokensLoading: true,
        providersLoading: true,
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

  describe('Selecting a token', () => {
    it('calls setSelectedToken with the asset id when a token row is pressed', () => {
      render(HeadlessPlayground);
      pressAccordion(HeadlessPlaygroundAccordionIndex.Tokens);
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
      pressAccordion(HeadlessPlaygroundAccordionIndex.Tokens);
      const selectedRow = screen.getByTestId(
        'headless-playground-token-eip155:1/erc20:0xabc',
      );
      expect(selectedRow.props.accessibilityState).toEqual({ selected: true });
    });
  });
});
