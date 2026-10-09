import type { TokenSecurityData } from '@metamask/assets-controllers';
import React, { useLayoutEffect, useState, type FC } from 'react';
import type { TokenDetailsRouteParams } from '../constants/constants';
import TokenDetailsStickyFooter from '../components/TokenDetailsStickyFooter';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import { MOCK_TRADER_POSITION_PNL } from './mockTraderPositionPnl';

interface TraderPositionPnlSectionProps {
  token: TokenDetailsRouteParams;
  tokenKey: string;
  securityData?: TokenSecurityData | null;
}

/**
 * Renders the trader position header and its temporary expanded details sheet.
 *
 * The Social API data will replace the development fixture once the position
 * endpoint is available.
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

  useLayoutEffect(() => {
    setIsExpanded(false);
  }, [tokenKey]);

  const traderPositionPnl = __DEV__
    ? {
        ...MOCK_TRADER_POSITION_PNL,
        isExpanded,
        onToggleExpanded: setIsExpanded,
      }
    : undefined;

  return (
    <>
      <TokenDetailsStickyFooter
        token={token}
        securityData={securityData}
        currentTokenBalance={token.balance ?? undefined}
        hasTokenBalance={Boolean(token.balance && token.balance !== '0')}
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
