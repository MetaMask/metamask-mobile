import type { TokenSecurityData } from '@metamask/assets-controllers';
import React, { useLayoutEffect, useState, type FC } from 'react';
import type { TokenDetailsRouteParams } from '../constants/constants';
import TokenDetailsStickyFooter from '../components/TokenDetailsStickyFooter';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useOpenPositionHeader } from './useOpenPositionHeader';

interface TraderPositionPnlSectionProps {
  token: TokenDetailsRouteParams;
  tokenKey: string;
  securityData?: TokenSecurityData | null;
}

/**
 * Renders the trader position header and its temporary expanded details sheet.
 *
 * The header reads this wallet's open position for the token. A missing or
 * still-indexing position shows the wallet value and hides PnL.
 */
const TraderPositionPnlSection: FC<TraderPositionPnlSectionProps> = ({
  token,
  tokenKey,
  securityData,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { onQuickBuyPress, openQuickBuy, quickBuySheet } = useStickyQuickBuy({
    token,
    source: 'asset_details',
  });
  const { balance } = useTokenBalance(token);
  const hasTokenBalance = balance !== undefined && Number(balance) > 0;
  const header = useOpenPositionHeader(token);

  useLayoutEffect(() => {
    setIsExpanded(false);
  }, [tokenKey]);

  const traderPositionPnl =
    header.positionValue !== undefined || header.isLoading
      ? {
          positionValue: header.positionValue,
          pnl: header.pnl,
          ...(header.expandedDetails
            ? { expandedDetails: header.expandedDetails }
            : {}),
          isLoading: header.isLoading,
          isExpanded,
          onToggleExpanded: setIsExpanded,
        }
      : undefined;

  return (
    <>
      <TokenDetailsStickyFooter
        token={token}
        securityData={securityData}
        isTokenDetailsV1
        currentTokenBalance={balance}
        hasTokenBalance={hasTokenBalance}
        onQuickBuyPress={onQuickBuyPress}
        quickBuyEntrypointLayout="buy_sell"
        onOpenQuickBuy={openQuickBuy}
        traderPositionPnl={traderPositionPnl}
      />
      {quickBuySheet}
    </>
  );
};

export default TraderPositionPnlSection;
