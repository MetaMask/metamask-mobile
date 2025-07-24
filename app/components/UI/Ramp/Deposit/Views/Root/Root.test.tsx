import { waitFor } from '@testing-library/react-native';
import Root from './Root';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { getOrders } from '../../../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockCheckExistingToken = jest.fn();
let mockGetStarted = true;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      reset: mockReset,
    }),
  };
});

jest.mock('../../sdk', () => {
  const actual = jest.requireActual('../../sdk');
  return {
    ...actual,
    useDepositSDK: () => ({
      checkExistingToken: mockCheckExistingToken,
      getStarted: mockGetStarted,
    }),
  };
});

jest.mock('../../../../../../reducers/fiatOrders', () => ({
  getOrders: jest.fn(),
  fiatOrdersGetStartedDeposit: jest.fn((_state: unknown) => true),
  setFiatOrdersGetStartedDeposit: jest.fn(),
  getActivationKeys: jest.fn((_state: unknown) => []),
  fiatOrdersRegionSelectorAgg: jest.fn((_state: unknown) => null),
  fiatOrdersGetStartedAgg: jest.fn((_state: unknown) => false),
  fiatOrdersGetStartedSell: jest.fn((_state: unknown) => false),
  fiatOrdersPaymentMethodSelectorAgg: jest.fn((_state: unknown) => null),
  networkShortNameSelector: jest.fn((_state: unknown) => 'ethereum'),
  selectedAddressSelector: jest.fn((_state: unknown) => '0x123'),
  chainIdSelector: jest.fn((_state: unknown) => '1'),
  setFiatOrdersGetStartedAGG: jest.fn(),
  setFiatOrdersRegionAGG: jest.fn(),
  setFiatOrdersPaymentMethodAGG: jest.fn(),
  setFiatOrdersGetStartedSell: jest.fn(),
}));

jest.mock(
  './GetStarted/GetStarted',
  () =>
    function MockGetStarted() {
      return null;
    },
);

jest.mock('../BankDetails/BankDetails', () => ({
  createBankDetailsNavDetails: jest
    .fn()
    .mockReturnValue(['BankDetails', { orderId: 'test-created-order-id' }]),
}));

jest.mock('../OrderProcessing/OrderProcessing', () => ({
  createOrderProcessingNavDetails: jest
    .fn()
    .mockReturnValue(['OrderProcessing', { orderId: 'test-pending-order-id' }]),
}));

describe('Root Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStarted = true;
    (getOrders as jest.MockedFunction<typeof getOrders>).mockReturnValue([]);
  });

  it('render matches snapshot', () => {
    const screen = renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls checkExistingToken on load', async () => {
    mockCheckExistingToken.mockResolvedValue(false);
    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    await waitFor(() => {
      expect(mockCheckExistingToken).toHaveBeenCalled();
    });
  });

  it('redirects to BUILD_QUOTE when getStarted is true', async () => {
    mockCheckExistingToken.mockResolvedValue(false);
    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.DEPOSIT.BUILD_QUOTE,
            params: { animationEnabled: false },
          },
        ],
      });
    });
  });

  it('does not redirect when getStarted is false', async () => {
    mockGetStarted = false;
    mockCheckExistingToken.mockResolvedValue(false);
    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    await waitFor(() => {
      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  it('redirects to bank details when there is a created order', async () => {
    const mockOrders = [
      {
        id: 'test-created-order-id',
        provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
        state: FIAT_ORDER_STATES.CREATED,
      },
    ] as FiatOrder[];

    (getOrders as jest.MockedFunction<typeof getOrders>).mockReturnValue(
      mockOrders,
    );
    mockCheckExistingToken.mockResolvedValue(false);
    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: 'BankDetails',
            params: {
              orderId: 'test-created-order-id',
              animationEnabled: false,
            },
          },
        ],
      });
    });
  });
});
