import { render } from '@testing-library/react-native';
import React from 'react';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenBalance } from '../hooks/useTokenBalance';
import TokenDetailsActionFooter from './TokenDetailsActionFooter';

const footerProps: Record<string, unknown>[] = [];

jest.mock(
  './TokenDetailsStickyFooter',
  () => (props: Record<string, unknown>) => {
    footerProps.push(props);
    return null;
  },
);

jest.mock('../hooks/useStickyQuickBuy', () => ({
  useStickyQuickBuy: () => ({
    onQuickBuyPress: jest.fn(),
    openQuickBuy: jest.fn(),
    quickBuySheet: null,
  }),
}));

jest.mock('../hooks/useTokenBalance', () => ({
  useTokenBalance: jest.fn(),
}));

jest.mock('../../Money/hooks/useMoneyAssetOverviewCtas', () => ({
  useMoneyAssetOverviewCtas: () => ({
    isFooterCtaLoading: false,
    isFooterCtaVisible: false,
    footerLabelLocalized: undefined,
    onFooterPress: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: (key: string) => {
    if (key.includes('QuickBuy')) {
      return {
        variant: { footerLayout: 'lightning_swap_buy' },
        variantName: 'control',
        isActive: false,
      };
    }
    if (key.includes('Ambient')) {
      return {
        variant: { useAmbientPriceColor: false },
        variantName: 'control',
        isActive: false,
      };
    }
    return {
      variant: { showMoneyDepositFooterCta: false },
      variantName: 'control',
      isActive: false,
    };
  },
}));

const mockUseTokenBalance = useTokenBalance as jest.MockedFunction<
  typeof useTokenBalance
>;

const token = {
  address: '0xabc',
  chainId: '0x1',
  symbol: 'PEPE',
} as TokenDetailsRouteParams;

const lastFooterProps = () => footerProps[footerProps.length - 1];

describe('TokenDetailsActionFooter', () => {
  beforeEach(() => {
    footerProps.length = 0;
    mockUseTokenBalance.mockReturnValue({
      balance: '10',
      fiatBalance: '$90.00',
      tokenFormattedBalance: '10 PEPE',
      balanceFiatUsd: 90,
    });
  });

  it('uses the quick-buy experiment layout instead of a launchpad-only button treatment', () => {
    render(<TokenDetailsActionFooter token={token} />);

    expect(lastFooterProps()).toEqual(
      expect.objectContaining({
        quickBuyEntrypointLayout: 'lightning_swap_buy',
        quickBuyTestID: TokenOverviewSelectorsIDs.QUICK_BUY_BUTTON,
        sourcePage: 'TokenDetailsView',
        tdpVersion: 'v2',
        hasTokenBalance: true,
      }),
    );
    expect(lastFooterProps().isTokenDetailsV1).toBeUndefined();
    expect(lastFooterProps().traderPositionPnl).toBeUndefined();
  });

  it.each<[string | undefined, boolean]>([
    ['10', true],
    ['1,234,567', true],
    ['<0.00001', true],
    ['0', false],
    ['', false],
    [undefined, false],
  ])(
    'sets hasTokenBalance from formatted balance %j to %s',
    (balance, hasTokenBalance) => {
      mockUseTokenBalance.mockReturnValue({
        balance,
        fiatBalance: '$0.00',
        tokenFormattedBalance: balance ? `${balance} PEPE` : undefined,
        balanceFiatUsd: 0,
      });

      render(<TokenDetailsActionFooter token={token} />);

      expect(lastFooterProps().hasTokenBalance).toBe(hasTokenBalance);
    },
  );

  it('forwards the launchpad position without changing the action bar', () => {
    const traderPositionPnl = {
      positionValue: '$150.00',
      isLoading: false,
      isExpanded: false,
      onToggleExpanded: jest.fn(),
    };

    render(
      <TokenDetailsActionFooter
        token={token}
        tdpVersion="v3"
        traderPositionPnl={traderPositionPnl}
      />,
    );

    expect(lastFooterProps()).toEqual(
      expect.objectContaining({
        tdpVersion: 'v3',
        traderPositionPnl,
        quickBuyEntrypointLayout: 'lightning_swap_buy',
      }),
    );
    expect(lastFooterProps().isTokenDetailsV1).toBeUndefined();
  });
});
