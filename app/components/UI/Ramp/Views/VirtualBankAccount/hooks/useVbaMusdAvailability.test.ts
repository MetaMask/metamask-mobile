import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  getMusdAutorampDepositRailReadiness,
  type NeoBankCustomerAbilities,
} from '@metamask/ramps-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { useVbaMusdAvailability } from './useVbaMusdAvailability';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('@metamask/ramps-controller', () => ({
  ...jest.requireActual('@metamask/ramps-controller'),
  getMusdAutorampDepositRailReadiness: jest.fn(),
}));
jest.mock('../../../../../../core/Engine', () => ({
  context: { RampsController: { refreshCustomerAbilities: jest.fn() } },
}));
jest.mock('../../../../../../util/Logger', () => ({ error: jest.fn() }));
jest.mock('../../../../../../hooks/useNetworkTier');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockGetReadiness = jest.mocked(getMusdAutorampDepositRailReadiness);
const mockRefreshCustomerAbilities = jest.mocked(
  Engine.context.RampsController.refreshCustomerAbilities,
);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

const ABILITIES = {} as NeoBankCustomerAbilities;

describe('useVbaMusdAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(null);
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockRefreshCustomerAbilities.mockReturnValue(new Promise(() => undefined));
  });

  it('reports unavailable from abilities already loaded, without fetching', () => {
    mockUseSelector.mockReturnValue(ABILITIES);
    mockGetReadiness.mockReturnValue('unavailable');

    const { result } = renderHook(() => useVbaMusdAvailability(true, 'EUR'));

    expect(result.current).toEqual({ isLoading: false, isUnavailable: true });
    expect(mockGetReadiness).toHaveBeenCalledWith(ABILITIES, 'EUR');
    expect(mockRefreshCustomerAbilities).not.toHaveBeenCalled();
  });

  it('reports available when abilities offer mUSD', () => {
    mockUseSelector.mockReturnValue(ABILITIES);
    mockGetReadiness.mockReturnValue('active');

    const { result } = renderHook(() => useVbaMusdAvailability(true, 'EUR'));

    expect(result.current).toEqual({ isLoading: false, isUnavailable: false });
  });

  it('fetches abilities once and reports loading while none are loaded', () => {
    const { result, rerender } = renderHook(() =>
      useVbaMusdAvailability(true, 'EUR'),
    );
    rerender();

    expect(result.current).toEqual({ isLoading: true, isUnavailable: false });
    expect(mockRefreshCustomerAbilities).toHaveBeenCalledTimes(1);
  });

  it('stops loading and logs when the fetch fails', async () => {
    const error = new Error('abilities failed');
    mockRefreshCustomerAbilities.mockRejectedValue(error);

    const { result } = renderHook(() => useVbaMusdAvailability(true, 'EUR'));

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        isUnavailable: false,
      }),
    );
    expect(Logger.error).toHaveBeenCalledWith(error, expect.any(Object));
  });

  it.each([
    ['the caller does not need the check', false, 'EUR', 'WIFI'],
    ['no market resolves', true, undefined, 'WIFI'],
    ['the device is offline', true, 'EUR', 'NONE'],
  ] as const)(
    'does not fetch or load when %s',
    (_label, shouldCheck, currency, networkTier) => {
      mockUseNetworkTier.mockReturnValue(networkTier);

      const { result } = renderHook(() =>
        useVbaMusdAvailability(shouldCheck, currency),
      );

      expect(result.current).toEqual({
        isLoading: false,
        isUnavailable: false,
      });
      expect(mockRefreshCustomerAbilities).not.toHaveBeenCalled();
    },
  );
});
