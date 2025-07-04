import { waitFor, screen } from '@testing-library/react-native';
import Root from './Root';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { getOrders } from '../../../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';

const mockReset = jest.fn();
const mockCheckExistingToken = jest.fn();
let mockGetStarted = true;

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

jest.mock('../../sdk', () => ({
  useDepositSDK: () => ({
    checkExistingToken: mockCheckExistingToken,
    getStarted: mockGetStarted,
  }),
}));

jest.mock('../../../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../../../reducers/fiatOrders'),
  getOrders: jest.fn(),
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
    (getOrders as jest.MockedFunction<typeof getOrders>).mockReturnValue([]);
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
});
