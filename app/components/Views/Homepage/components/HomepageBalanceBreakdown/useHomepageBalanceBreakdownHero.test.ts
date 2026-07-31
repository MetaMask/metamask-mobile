import { act, renderHook } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import {
  cancelAnimation,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import I18n from '../../../../../../locales/i18n';
import { TEST_NETWORK_IDS } from '../../../../../constants/network';
import Engine from '../../../../../core/Engine';
import { selectAccountGroupBalanceForEmptyState } from '../../../../../selectors/assets/balances';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import type { HeroData } from '../../BalanceBreakdown/types';
import { useHomepageBalanceBreakdownHero } from './useHomepageBalanceBreakdownHero';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  cancelAnimation: jest.fn(),
  withRepeat: jest.fn((animation) => animation),
  withTiming: jest.fn((value) => value),
}));
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setPrivacyMode: jest.fn(),
    },
  },
}));
jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: (amount: number, currency: string) =>
      `${currency} ${amount.toFixed(2)}`,
  }),
}));

const baseHero: HeroData = {
  status: 'ready',
  totalFiat: 100,
  userCurrency: 'USD',
  delta: { amount: 10, percent: 0.1 },
};

const mockUseSelector = jest.mocked(useSelector);
const originalLocale = I18n.locale;

describe('useHomepageBalanceBreakdownHero', () => {
  let privacyMode: boolean;
  let selectedChainId: string;
  let allNetworkBalance: number;

  beforeEach(() => {
    jest.clearAllMocks();
    privacyMode = false;
    selectedChainId = '0x1';
    allNetworkBalance = 100;
    I18n.locale = 'en-US';
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPrivacyMode) return privacyMode;
      if (selector === selectEvmChainId) return selectedChainId;
      if (selector === selectAccountGroupBalanceForEmptyState) {
        return { totalBalanceInUserCurrency: allNetworkBalance };
      }
      return undefined;
    });
  });

  afterAll(() => {
    I18n.locale = originalLocale;
  });

  it('uses the all-network control balance for the empty state', () => {
    const hero = { ...baseHero, totalFiat: 0 };
    const { result, rerender } = renderHook(() =>
      useHomepageBalanceBreakdownHero(hero),
    );

    expect(result.current.shouldShowEmptyState).toBe(false);

    allNetworkBalance = 0;
    rerender({});

    expect(result.current.shouldShowEmptyState).toBe(true);
  });

  it('suppresses the empty state on testnets', () => {
    selectedChainId = TEST_NETWORK_IDS[0];
    allNetworkBalance = 0;
    const { result } = renderHook(() =>
      useHomepageBalanceBreakdownHero({
        ...baseHero,
        totalFiat: 0,
      }),
    );

    expect(result.current.shouldShowEmptyState).toBe(false);
  });

  it('suppresses the empty state for incomplete portfolios', () => {
    allNetworkBalance = 0;
    const { result } = renderHook(() =>
      useHomepageBalanceBreakdownHero({
        ...baseHero,
        hasErroredSlice: true,
        totalFiat: 0,
      }),
    );

    expect(result.current.shouldShowEmptyState).toBe(false);
  });

  it('mutes delta colors in privacy mode', () => {
    privacyMode = true;
    const { result } = renderHook(() =>
      useHomepageBalanceBreakdownHero(baseHero),
    );

    expect(result.current.deltaColor).toBe(TextColor.TextAlternative);
  });

  it('toggles privacy through PreferencesController', () => {
    const { result } = renderHook(() =>
      useHomepageBalanceBreakdownHero(baseHero),
    );

    act(() => result.current.togglePrivacy());

    expect(
      Engine.context.PreferencesController.setPrivacyMode,
    ).toHaveBeenCalledWith(true);
  });

  it('pulses only while another slice is loading', () => {
    const { rerender } = renderHook(
      ({ isPartiallyLoaded }) =>
        useHomepageBalanceBreakdownHero({
          ...baseHero,
          isPartiallyLoaded,
        }),
      { initialProps: { isPartiallyLoaded: true } },
    );

    expect(withTiming).toHaveBeenCalledWith(0.6, { duration: 900 });
    expect(withRepeat).toHaveBeenCalled();

    jest.mocked(withRepeat).mockClear();
    rerender({ isPartiallyLoaded: false });

    expect(cancelAnimation).toHaveBeenCalled();
    expect(withRepeat).not.toHaveBeenCalled();
  });
});
