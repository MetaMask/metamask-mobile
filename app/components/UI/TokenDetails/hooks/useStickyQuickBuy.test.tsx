import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useStickyQuickBuy } from './useStickyQuickBuy';
import { SOCIAL_AI_QUICK_BUY_VARIANTS } from '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/abTestConfig';
import type { AssetDetailsQuickBuyProps } from '../components/AssetDetailsQuickBuy';
import { TokenDetailsSource } from '../constants/constants';

const mockPlayImpact = jest.fn();
jest.mock('../../../../util/haptics', () => ({
  playImpact: (...args: unknown[]) => mockPlayImpact(...args),
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
}));

let mockShowQuickBuy = false;
jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: () => ({
    variant: { showQuickBuy: mockShowQuickBuy },
    variantName: mockShowQuickBuy ? 'treatment' : 'control',
    isActive: mockShowQuickBuy,
  }),
}));

jest.mock('../components/AssetDetailsQuickBuy', () => ({
  __esModule: true,
  default: (_props: unknown) => null,
}));

const defaultToken = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
  symbol: 'DAI',
  name: 'Dai Stablecoin',
  decimals: 18,
  balance: '100',
  balanceFiat: '$100',
  logo: '',
  image: '',
  isETH: false,
  hasBalanceError: false,
  aggregators: [],
  source: TokenDetailsSource.MobileTokenList,
};

describe('useStickyQuickBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowQuickBuy = false;
  });

  describe('when the quick-buy flag is off', () => {
    it('returns onQuickBuyPress as undefined', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      expect(result.current.onQuickBuyPress).toBeUndefined();
    });

    it('returns quickBuySheet as null', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      expect(result.current.quickBuySheet).toBeNull();
    });

    it('returns isQuickBuyEnabled as false', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      expect(result.current.isQuickBuyEnabled).toBe(false);
    });
  });

  describe('when the quick-buy flag is on', () => {
    beforeEach(() => {
      mockShowQuickBuy = true;
    });

    it('returns isQuickBuyEnabled as true', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      expect(result.current.isQuickBuyEnabled).toBe(true);
    });

    it('returns a defined onQuickBuyPress', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      expect(result.current.onQuickBuyPress).toBeDefined();
    });

    it('returns a non-null quickBuySheet', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      expect(result.current.quickBuySheet).not.toBeNull();
    });

    it('calls playImpact when onQuickBuyPress is invoked', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      act(() => {
        result.current.onQuickBuyPress?.();
      });

      expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    });

    it('invokes the optional onPress callback when onQuickBuyPress is called', () => {
      const onPress = jest.fn();
      const { result } = renderHook(() =>
        useStickyQuickBuy({
          token: defaultToken,
          source: 'asset_details',
          onPress,
        }),
      );

      act(() => {
        result.current.onQuickBuyPress?.();
      });

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('returns a quickBuySheet that is a valid React element', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      expect(React.isValidElement(result.current.quickBuySheet)).toBe(true);
    });

    it('passes the correct source to the sheet element', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'security_trust' }),
      );

      const sheet = result.current
        .quickBuySheet as React.ReactElement<AssetDetailsQuickBuyProps>;
      expect(sheet.props.source).toBe('security_trust');
    });

    it('passes the token to the sheet element', () => {
      const { result } = renderHook(() =>
        useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
      );

      const sheet = result.current
        .quickBuySheet as React.ReactElement<AssetDetailsQuickBuyProps>;
      expect(sheet.props.token).toEqual(defaultToken);
    });
  });

  it('derives isQuickBuyEnabled from the A/B variant showQuickBuy flag', () => {
    expect(SOCIAL_AI_QUICK_BUY_VARIANTS.control.showQuickBuy).toBe(false);
    expect(SOCIAL_AI_QUICK_BUY_VARIANTS.treatment.showQuickBuy).toBe(true);

    mockShowQuickBuy = true;
    const { result } = renderHook(() =>
      useStickyQuickBuy({ token: defaultToken, source: 'asset_details' }),
    );

    expect(result.current.isQuickBuyEnabled).toBe(true);
  });
});
