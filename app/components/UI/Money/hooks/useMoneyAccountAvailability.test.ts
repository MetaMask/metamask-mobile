import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  navigateToMoneyAccountAccessNotice,
  useMoneyAccountAccessRedirect,
  useMoneyAccountAvailability,
} from './useMoneyAccountAvailability';
import type { MoneyAccountAccessBlockReason } from '../utils/moneyAccountAccess';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

const mockNavigate = jest.fn();
let mockAccessBlockReason: MoneyAccountAccessBlockReason | undefined;

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useMoneyAccountAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessBlockReason = undefined;
    mockUseSelector.mockImplementation(() => mockAccessBlockReason);
  });

  it('returns accessible state when no block reason exists', () => {
    const { result } = renderHook(() => useMoneyAccountAvailability());

    expect(result.current).toStrictEqual({
      accessBlockReason: undefined,
      isMoneyAccountAccessible: true,
    });
  });

  it('returns inaccessible state with its block reason', () => {
    mockAccessBlockReason = 'geo_blocked';

    const { result } = renderHook(() => useMoneyAccountAvailability());

    expect(result.current).toStrictEqual({
      accessBlockReason: 'geo_blocked',
      isMoneyAccountAccessible: false,
    });
  });
});

describe('useMoneyAccountAccessRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessBlockReason = undefined;
    mockUseSelector.mockImplementation(() => mockAccessBlockReason);
  });

  it('redirects once while the same block reason remains active', () => {
    mockAccessBlockReason = 'geo_blocked';
    const { rerender, result } = renderHook(() =>
      useMoneyAccountAccessRedirect(),
    );

    rerender();

    expect(result.current).toBe(false);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('redirects again after access recovers and becomes blocked', () => {
    mockAccessBlockReason = 'geo_blocked';
    const { rerender } = renderHook(() => useMoneyAccountAccessRedirect());
    mockAccessBlockReason = undefined;
    rerender();
    mockAccessBlockReason = 'feature_disabled';

    rerender();

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(
      Routes.MONEY.MODALS.DEEPLINK_MODAL,
      expect.any(Object),
    );
  });
});

describe('navigateToMoneyAccountAccessNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the geo-block sheet for a geo restriction', () => {
    navigateToMoneyAccountAccessNotice(
      { navigate: mockNavigate } as unknown as AppNavigationProp,
      'geo_blocked',
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
  });

  it('opens the disabled notice when the feature is disabled', () => {
    navigateToMoneyAccountAccessNotice(
      { navigate: mockNavigate } as unknown as AppNavigationProp,
      'feature_disabled',
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.MODALS.DEEPLINK_MODAL,
      expect.any(Object),
    );
  });
});
