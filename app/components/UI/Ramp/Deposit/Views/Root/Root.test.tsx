import { waitFor, screen } from '@testing-library/react-native';
import Root from './Root';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { getAllDepositOrders } from '../../../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';

const mockReset = jest.fn();
const mockCheckExistingToken = jest.fn();
let mockGetStarted = true;
const mockSelectedRegion = {
  isoCode: 'US',
  flag: '🇺🇸',
  name: 'United States',
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      ...actualReactNavigation.useNavigation(),
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
      selectedRegion: mockSelectedRegion,
    }),
  };
});

jest.mock('../../../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../../../reducers/fiatOrders'),
  getAllDepositOrders: jest.fn(),
  fiatOrdersGetStartedDeposit: jest.fn((_state: unknown) => true),
  setFiatOrdersGetStartedDeposit: jest.fn(),
  fiatOrdersRegionSelectorDeposit: jest.fn(
    (_state: unknown) => mockSelectedRegion,
  ),
  setFiatOrdersRegionDeposit: jest.fn(),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.ROOT,
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

describe('Root Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStarted = true;
    (
      getAllDepositOrders as jest.MockedFunction<typeof getAllDepositOrders>
    ).mockReturnValue([]);
  });

  it('render matches snapshot', () => {
    render(Root);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls checkExistingToken on load', async () => {
    mockCheckExistingToken.mockResolvedValue(false);
    render(Root);
    await waitFor(() => {
      expect(mockCheckExistingToken).toHaveBeenCalled();
    });
  });

  it('redirects to BUILD_QUOTE when getStarted is true', async () => {
    mockCheckExistingToken.mockResolvedValue(false);
    render(Root);
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
    render(Root);
    await waitFor(() => {
      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  it('redirects to bank details when there is a created order and user is authenticated', async () => {
    const mockOrders = [
      {
        id: 'test-created-order-id',
        provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
        state: FIAT_ORDER_STATES.CREATED,
      },
    ] as FiatOrder[];

    (
      getAllDepositOrders as jest.MockedFunction<typeof getAllDepositOrders>
    ).mockReturnValue(mockOrders);
    mockCheckExistingToken.mockResolvedValue(true); // User is authenticated
    render(Root);

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

  it('redirects to enterEmail with redirectToRootAfterAuth when there is a created order and user is not authenticated', async () => {
    const mockOrders = [
      {
        id: 'test-created-order-id-unauth',
        provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
        state: FIAT_ORDER_STATES.CREATED,
      },
    ] as FiatOrder[];

    (
      getAllDepositOrders as jest.MockedFunction<typeof getAllDepositOrders>
    ).mockReturnValue(mockOrders);
    mockCheckExistingToken.mockResolvedValue(false); // User is not authenticated
    render(Root);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: 'EnterEmail',
            params: {
              redirectToRootAfterAuth: true,
              animationEnabled: false,
            },
          },
        ],
      });
    });
  });
});
