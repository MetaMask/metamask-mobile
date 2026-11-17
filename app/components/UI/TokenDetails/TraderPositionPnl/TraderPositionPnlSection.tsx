import type { TokenSecurityData } from '@metamask/assets-controllers';
import React, { type FC } from 'react';
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
      />
      {quickBuySheet}
    </>
  );
};

export default TraderPositionPnlSection;
