import type { TokenSecurityData } from '@metamask/assets-controllers';
import React, { useMemo } from 'react';
import { useABTest } from '../../../../hooks/useABTest';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { useMoneyAssetOverviewCtas } from '../../Money/hooks/useMoneyAssetOverviewCtas';
import {
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY,
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_EXPOSURE_METADATA,
  SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS,
} from '../../QuickBuy/abTestConfig';
import type { TdpVersion } from '../analytics/getTdpAnalyticsBase';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import { useTokenBalance } from '../hooks/useTokenBalance';
import type { TraderPositionPnlProps } from '../TraderPositionPnl/TraderPositionPnl';
import {
  AMBIENT_PRICE_COLOR_AB_KEY,
  AMBIENT_PRICE_COLOR_VARIANTS,
  EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_AB_KEY,
  EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_VARIANTS,
} from './abTestConfig';
import TokenDetailsStickyFooter from './TokenDetailsStickyFooter';

type StickyButtonLayout =
  | 'both'
  | 'buy'
  | 'swap'
  | 'money_swap'
  | 'money'
  | 'buy_sell'
  | null;

interface TokenDetailsActionFooterProps {
  token: TokenDetailsRouteParams;
  securityData?: TokenSecurityData | null;
  /** `'v3'` on the launchpad page, `'v2'` on the legacy page and while it is still loading. */
  tdpVersion?: TdpVersion;
  /** Page name sent with swap and bridge analytics. */
  sourcePage?: string;
  networkName?: string;
  onSwapPress?: () => void;
  onBuyPress?: () => void;
  onStickyButtonsResolved?: (shown: StickyButtonLayout) => void;
  onFooterLayout?: (height: number) => void;
  /**
   * Launchpad-only position header. Omit it on the legacy page and while the
   * page is still loading.
   */
  traderPositionPnl?: TraderPositionPnlProps;
}

/**
 * Locale-formatted balances (`1,234,567`, `<0.00001`) are still holdings.
 * `Number()` is NaN for those strings and would hide Sell.
 */
const hasHoldingBalance = (balance: string | undefined): boolean =>
  Boolean(balance) && balance !== '0';

/**
 * Action bar shared by the legacy Token Details page, the launchpad page, and
 * the loading state between them.
 *
 * Both pages use this bar, so Buy, Sell, and Swap stay put while `/v2/assets`
 * chooses the page. The launchpad position and PnL block is separate: only
 * that page passes `traderPositionPnl`.
 */
const TokenDetailsActionFooter = ({
  token,
  securityData,
  tdpVersion = 'v2',
  sourcePage = 'TokenDetailsView',
  networkName,
  onSwapPress,
  onBuyPress,
  onStickyButtonsResolved,
  onFooterLayout,
  traderPositionPnl,
}: TokenDetailsActionFooterProps) => {
  const { variant: quickBuyEntrypointVariant } = useABTest(
    SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY,
    SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS,
    SWAPS5094_QUICK_BUY_ENTRYPOINTS_EXPOSURE_METADATA,
  );
  const { variant: ambientColorVariant } = useABTest(
    AMBIENT_PRICE_COLOR_AB_KEY,
    AMBIENT_PRICE_COLOR_VARIANTS,
  );
  const { variant: moneyFooterCtaVariant } = useABTest(
    EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_AB_KEY,
    EARN_MONEY_DEPOSIT_FOOTER_CTA_VISIBILITY_VARIANTS,
  );
  const { onQuickBuyPress, openQuickBuy, quickBuySheet } = useStickyQuickBuy({
    token,
    source: 'asset_details',
  });
  const { balance, balanceFiatUsd } = useTokenBalance(token, {
    calculateUsdBalance: true,
  });
  const hasTokenBalance = hasHoldingBalance(balance);
  const moneyAssetOverviewCtas = useMoneyAssetOverviewCtas({
    asset: token,
    balanceFiatUsd: balanceFiatUsd ?? 0,
    hasBalance: hasTokenBalance,
  });
  const isMoneyFooterCtaActive =
    moneyFooterCtaVariant.showMoneyDepositFooterCta &&
    (moneyAssetOverviewCtas.isFooterCtaLoading ||
      moneyAssetOverviewCtas.isFooterCtaVisible);
  const moneyDepositCta = useMemo(
    () =>
      isMoneyFooterCtaActive
        ? {
            isLoading: moneyAssetOverviewCtas.isFooterCtaLoading,
            label: moneyAssetOverviewCtas.footerLabelLocalized,
            onPress: moneyAssetOverviewCtas.onFooterPress,
          }
        : undefined,
    [
      isMoneyFooterCtaActive,
      moneyAssetOverviewCtas.isFooterCtaLoading,
      moneyAssetOverviewCtas.footerLabelLocalized,
      moneyAssetOverviewCtas.onFooterPress,
    ],
  );

  return (
    <>
      <TokenDetailsStickyFooter
        token={token}
        securityData={securityData}
        balanceFiatUsd={balanceFiatUsd}
        networkName={networkName}
        currentTokenBalance={balance}
        hasTokenBalance={hasTokenBalance}
        moneyDepositCta={moneyDepositCta}
        onStickyButtonsResolved={onStickyButtonsResolved}
        sourcePage={sourcePage}
        useAmbientColor={ambientColorVariant.useAmbientPriceColor}
        onSwapPress={onSwapPress}
        onBuyPress={onBuyPress}
        onQuickBuyPress={onQuickBuyPress}
        quickBuyTestID={TokenOverviewSelectorsIDs.QUICK_BUY_BUTTON}
        quickBuyEntrypointLayout={quickBuyEntrypointVariant.footerLayout}
        onOpenQuickBuy={openQuickBuy}
        tdpVersion={tdpVersion}
        traderPositionPnl={traderPositionPnl}
        onFooterLayout={onFooterLayout}
      />
      {quickBuySheet}
    </>
  );
};

export default TokenDetailsActionFooter;
