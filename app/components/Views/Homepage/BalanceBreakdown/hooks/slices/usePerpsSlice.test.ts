import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks';
import { usePerpsConnection } from '../../../../../UI/Perps/hooks/usePerpsConnection';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import {
  selectPerpsBalances,
  selectPerpsEligibility,
  selectPerpsProvider,
} from '../../../../../UI/Perps/selectors/perpsController';
import { usePerpsSlice } from './usePerpsSlice';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../UI/Perps/hooks', () => ({
  usePerpsLiveAccount: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/hooks/usePerpsConnection');

const mockUseSelector = jest.mocked(useSelector);
const mockUsePerpsLiveAccount = jest.mocked(usePerpsLiveAccount);
const mockUsePerpsConnection = jest.mocked(usePerpsConnection);

describe('usePerpsSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsEligibility) return true;
      if (selector === selectPerpsProvider) return 'hyperliquid';
      if (selector === selectPerpsBalances) {
        return {
          hyperliquid: { accountValue1dAgo: '80' },
        };
      }
      return undefined;
    });
    mockUsePerpsLiveAccount.mockReturnValue({
      account: { totalBalance: '100' },
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveAccount>);
    mockUsePerpsConnection.mockReturnValue({
      error: null,
    } as ReturnType<typeof usePerpsConnection>);
  });

  it('uses account total balance and the active provider baseline', () => {
    const { result } = renderHook(() => usePerpsSlice((amount) => amount * 2));

    expect(result.current).toMatchObject({
      status: 'ready',
      valueFiat: 200,
      value1dAgoFiat: 160,
    });
  });

  it('is ineligible when the feature is unavailable', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectPerpsEligibility) return true;
      if (selector === selectPerpsBalances) return {};
      return undefined;
    });

    const { result } = renderHook(() => usePerpsSlice((amount) => amount * 2));

    expect(mockUsePerpsLiveAccount).toHaveBeenCalledWith({
      enabled: false,
      throttleMs: 1000,
    });
    expect(result.current.status).toBe('ineligible');
    expect(result.current.valueFiat).toBe(0);
  });

  it('reports a connection error when no account data is available', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: null,
      isInitialLoading: true,
    });
    mockUsePerpsConnection.mockReturnValue({
      error: 'Connection failed',
    } as ReturnType<typeof usePerpsConnection>);

    const { result } = renderHook(() => usePerpsSlice((amount) => amount));

    expect(result.current.status).toBe('error');
  });

  it('reports an error when fiat conversion is unavailable', () => {
    const { result } = renderHook(() => usePerpsSlice(() => undefined));

    expect(result.current.status).toBe('error');
    expect(result.current.valueFiat).toBe(0);
  });
});
