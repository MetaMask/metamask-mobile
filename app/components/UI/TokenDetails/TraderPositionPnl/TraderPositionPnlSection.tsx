import type { TokenSecurityData } from '@metamask/assets-controllers';
import React, { type FC } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { TokenDetailsRouteParams } from '../constants/constants';
import TokenDetailsStickyFooter from '../components/TokenDetailsStickyFooter';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTraderPositionPnl } from './useTraderPositionPnl';

interface TraderPositionPnlSectionProps {
  token: TokenDetailsRouteParams;
  tokenKey: string;
  securityData?: TokenSecurityData | null;
  /** Reports the laid-out height of the sticky footer. */
  onFooterLayout?: (height: number) => void;
  /** Reports how far the floating Buy/Sell row reaches up from the bottom. */
  onFloatingActionsInsetChange?: (inset: number) => void;
  /** Page scroll offset; scrolling down slides the floating actions away. */
  floatingActionsScrollY?: SharedValue<number>;
}

/**
 * Renders the trader position header and its temporary expanded details sheet.
 *
 * The header reads this wallet's open position in this token. A missing
 * position shows the wallet value and hides PnL.
 */
const TraderPositionPnlSection: FC<TraderPositionPnlSectionProps> = ({
  token,
  tokenKey,
  securityData,
  onFooterLayout,
  onFloatingActionsInsetChange,
  floatingActionsScrollY,
}) => {
  const { onQuickBuyPress, openQuickBuy, quickBuySheet } = useStickyQuickBuy({
    token,
    source: 'asset_details',
  });
  const { balance } = useTokenBalance(token);
  const hasTokenBalance = Boolean(balance) && balance !== '0';
  const { traderPositionPnl } = useTraderPositionPnl({ token, tokenKey });

  return (
    <>
      <TokenDetailsStickyFooter
        token={token}
        securityData={securityData}
        isTokenDetailsV1
        tdpVersion="v3"
        currentTokenBalance={balance}
        hasTokenBalance={hasTokenBalance}
        onQuickBuyPress={onQuickBuyPress}
        quickBuyEntrypointLayout="buy_sell"
        onOpenQuickBuy={openQuickBuy}
        traderPositionPnl={traderPositionPnl}
        onFooterLayout={onFooterLayout}
        isFloatingActions
        onFloatingActionsInsetChange={onFloatingActionsInsetChange}
        floatingActionsScrollY={floatingActionsScrollY}
      />
      {quickBuySheet}
    </>
  );
};

export default TraderPositionPnlSection;
