import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { waitFor } from '@testing-library/react-native';
import { useRampsPreferredProviderAutoSet } from './useRampsPreferredProviderAutoSet';
import { determinePreferredProvider } from '../utils/determinePreferredProvider';
import { useRampsPreferredProvider } from './useRampsPreferredProvider';
import type { Provider as RampProvider } from '@metamask/ramps-controller';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { Order } from '@consensys/on-ramp-sdk';
import initialRootState from '../../../../util/test/initial-root-state';

jest.mock('../utils/determinePreferredProvider');
jest.mock('./useRampsPreferredProvider');

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupWithInternalAccountsAddresses: () => ['0x123'],
  }),
);

const mockProvider: RampProvider = {
  id: 'test-provider',
  name: 'Test Provider',
  environmentType: 'PRODUCTION',
  description: 'Test Provider Description',
  hqAddress: '123 Test St',
  links: [],
  logos: {
    light: 'https://example.com/logo-light.png',
    dark: 'https://example.com/logo-dark.png',
    height: 24,
    width: 79,
  },
};

const mockSetPreferredProvider = jest.fn();
const mockAccount = '0x123';

beforeEach(() => {
  jest.clearAllMocks();
  (useRampsPreferredProvider as jest.Mock).mockReturnValue({
    preferredProvider: null,
    setPreferredProvider: mockSetPreferredProvider,
  });
});

const createMockState = (
  orders: FiatOrder[] = [],
  providers: RampProvider[] = [],
) => ({
  ...initialRootState,
  fiatOrders: {
    ...initialRootState.fiatOrders,
    orders,
  },
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      RampsController: {
        ...initialRootState.engine.backgroundState.RampsController,
        providers,
      },
    },
  },
});

describe('useRampsPreferredProviderAutoSet', () => {
  it('does not set provider when providers list is empty', () => {
    renderHookWithProvider(() => useRampsPreferredProviderAutoSet(), {
      state: createMockState([], []),
    });

    expect(determinePreferredProvider).not.toHaveBeenCalled();
    expect(mockSetPreferredProvider).not.toHaveBeenCalled();
  });

  it('sets preferred provider when providers are available', async () => {
    const orders: FiatOrder[] = [
      {
        id: 'order-1',
        provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
        createdAt: 1000,
        amount: '100',
        currency: 'USD',
        cryptocurrency: 'ETH',
        state: FIAT_ORDER_STATES.COMPLETED,
        account: mockAccount,
        network: '1',
        orderType: 'BUY',
        excludeFromPurchases: false,
        data: {
          provider: { id: 'test-provider' },
        } as Order,
      },
    ];

    (determinePreferredProvider as jest.Mock).mockReturnValue(mockProvider);

    renderHookWithProvider(() => useRampsPreferredProviderAutoSet(), {
      state: createMockState(orders, [mockProvider]),
    });

    await waitFor(() => {
      expect(determinePreferredProvider).toHaveBeenCalledWith(orders, [
        mockProvider,
      ]);
      expect(mockSetPreferredProvider).toHaveBeenCalledWith(mockProvider);
    });
  });

  it('does not set provider if determined provider is null', async () => {
    (determinePreferredProvider as jest.Mock).mockReturnValue(null);

    renderHookWithProvider(() => useRampsPreferredProviderAutoSet(), {
      state: createMockState([], [mockProvider]),
    });

    await waitFor(() => {
      expect(determinePreferredProvider).toHaveBeenCalled();
    });

    expect(mockSetPreferredProvider).not.toHaveBeenCalled();
  });

  it('does not update if preferred provider is already set to the determined provider', async () => {
    const orders: FiatOrder[] = [];

    (useRampsPreferredProvider as jest.Mock).mockReturnValue({
      preferredProvider: mockProvider,
      setPreferredProvider: mockSetPreferredProvider,
    });

    (determinePreferredProvider as jest.Mock).mockReturnValue(mockProvider);

    renderHookWithProvider(() => useRampsPreferredProviderAutoSet(), {
      state: createMockState(orders, [mockProvider]),
    });

    await waitFor(() => {
      expect(determinePreferredProvider).toHaveBeenCalled();
    });

    expect(mockSetPreferredProvider).not.toHaveBeenCalled();
  });
});
