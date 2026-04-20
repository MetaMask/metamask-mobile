import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import V2OrderProcessing from './OrderProcessing';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { Linking } from 'react-native';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
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
  }),
}));

jest.mock('../../Deposit/constants', () => ({
  TRANSAK_SUPPORT_URL: 'https://support.transak.com',
}));

let mockOrder: unknown = null;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (_selector: unknown) => mockOrder,
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

jest.mock(
  '../../Deposit/components/DepositOrderContent/DepositOrderContent',
  () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => createElement(View, { testID: 'deposit-order-content' }),
    };
  },
);

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2OrderProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder = null;
  });

  it('matches snapshot when order is null (loading)', () => {
    mockOrder = null;
    const { toJSON } = renderWithTheme(<V2OrderProcessing />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders loader when order is not available', () => {
    mockOrder = null;
    const { getByTestId } = renderWithTheme(<V2OrderProcessing />);
    expect(getByTestId('loader')).toBeOnTheScreen();
  });

  it('matches snapshot when order is pending', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.PENDING,
      data: {},
    };
    const { toJSON } = renderWithTheme(<V2OrderProcessing />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates home when main button is pressed for pending order', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.PENDING,
      data: {},
    };
    const { getByTestId } = renderWithTheme(<V2OrderProcessing />);

    fireEvent.press(getByTestId('main-action-button'));

    expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome');
  });

  it('navigates to amount input when main button is pressed for cancelled order', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CANCELLED,
      data: {},
    };
    const { getByTestId } = renderWithTheme(<V2OrderProcessing />);

    fireEvent.press(getByTestId('main-action-button'));

    expect(mockNavigate).toHaveBeenCalledWith('RampAmountInput');
  });

  it('opens support URL when contact support button is pressed for failed order', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.FAILED,
      data: {},
    };
    const { getByText } = renderWithTheme(<V2OrderProcessing />);

    fireEvent.press(
      getByText('deposit.order_processing.contact_support_button'),
    );

    expect(spy).toHaveBeenCalledWith('https://support.transak.com');
  });
});
