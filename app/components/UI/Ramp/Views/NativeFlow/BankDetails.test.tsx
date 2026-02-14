import React from 'react';
import { render } from '@testing-library/react-native';
import V2BankDetails from './BankDetails';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    dispatch: mockDispatch,
  }),
  StackActions: {
    replace: (route: string, params: unknown) => ({
      type: 'Navigation/REPLACE',
      routeName: route,
      params,
    }),
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}`;
    return key;
  },
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    orderId: 'test-order-id',
    shouldUpdate: true,
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  ...jest.requireActual('../../../../../util/theme'),
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      icon: { default: '#6A737D' },
    },
  }),
}));

const mockGetOrder = jest.fn();
const mockConfirmPayment = jest.fn();
const mockCancelOrder = jest.fn();
const mockLogoutFromProvider = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    userRegion: {
      country: { isoCode: 'US', currency: 'USD' },
      regionCode: 'us-ca',
    },
    logoutFromProvider: mockLogoutFromProvider,
    getOrder: mockGetOrder,
    confirmPayment: mockConfirmPayment,
    cancelOrder: mockCancelOrder,
  }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectTokens: () => ({
    data: null,
    selected: {
      assetId: 'eip155:1/erc20:0x123',
      chainId: 'eip155:1',
    },
    isLoading: false,
    error: null,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../hooks/useThunkDispatch', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));

jest.mock('../../Deposit/utils', () => ({
  hasDepositOrderField: (data: unknown, field: string) => {
    if (!data || typeof data !== 'object') return false;
    return field in (data as Record<string, unknown>);
  },
  generateThemeParameters: jest.fn(() => ({})),
}));

jest.mock('../../Deposit/orderProcessor', () => ({
  depositOrderToFiatOrder: jest.fn((order) => ({
    ...order,
    orderType: 'BUY',
  })),
}));

jest.mock(
  '../../../../../component-library/components-temp/Loader/Loader',
  () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => createElement(View, { testID: 'loader' }),
    };
  },
);

jest.mock('../../Deposit/components/BankDetailRow', () => {
  const { createElement } = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ label, value }: { label: string; value: string }) =>
      createElement(
        View,
        { testID: `bank-detail-${label}` },
        createElement(Text, null, label),
        createElement(Text, null, value),
      ),
  };
});

let mockOrder: unknown = null;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => {
    if (
      typeof selector === 'function' &&
      (selector as { name?: string }).name === 'selectTokens'
    ) {
      return {
        data: null,
        selected: { assetId: 'eip155:1/erc20:0x123', chainId: 'eip155:1' },
        isLoading: false,
        error: null,
      };
    }
    return mockOrder;
  },
  useDispatch: () => jest.fn(),
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2BankDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder = null;
  });

  it('matches snapshot when order is null (loading)', () => {
    mockOrder = null;
    const { toJSON } = renderWithTheme(<V2BankDetails />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders loader when order is not available', () => {
    mockOrder = null;
    const { getByTestId } = renderWithTheme(<V2BankDetails />);
    expect(getByTestId('loader')).toBeOnTheScreen();
  });

  it('matches snapshot with order data', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [
              { name: 'Amount', value: '$100.00' },
              { name: 'First Name (Beneficiary)', value: 'john' },
              { name: 'Last Name (Beneficiary)', value: 'doe' },
              { name: 'Account Number', value: '123456789' },
              { name: 'Routing Number', value: '987654321' },
              { name: 'Account Type', value: 'checking' },
              { name: 'Bank Name', value: 'test bank' },
            ],
          },
        ],
      },
    };
    const { toJSON } = renderWithTheme(<V2BankDetails />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders bank detail rows when order has payment details', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [
              { name: 'Amount', value: '$100.00' },
              { name: 'Account Number', value: '123456789' },
            ],
          },
        ],
      },
    };
    const { getByText } = renderWithTheme(<V2BankDetails />);

    expect(getByText('deposit.bank_details.main_title')).toBeOnTheScreen();
  });

  it('renders the refresh control scroll view', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      data: {
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [],
      },
    };
    const { getByTestId } = renderWithTheme(<V2BankDetails />);
    expect(
      getByTestId('bank-details-refresh-control-scrollview'),
    ).toBeOnTheScreen();
  });
});
