import React from 'react';
import type { DefaultFeedItem } from '../mocks/types';
import CardShell from './CardShell';

interface DefaultTokenCardProps {
  item: DefaultFeedItem;
}

/**
 * Compact "no-post" variant used for filler feed entries — shows just the
 * token, side pill, market/volume subtitle, and the current price with a
 * percent change. No chart, no CTA row.
 */
const DefaultTokenCard: React.FC<DefaultTokenCardProps> = ({ item }) => {
  const { position } = item;
  return (
    <CardShell
      tokenSymbol={position.tokenSymbol}
      tokenLogo={position.tokenLogo}
      sidePill={{
        label: position.side === 'buy' ? 'Buy' : 'Sell',
        tone: position.side === 'buy' ? 'positive' : 'negative',
      }}
      subtitle={`${position.marketCap} \u00b7 ${position.volume}`}
      pnlAbs={position.price}
      pnlPct={position.pnlPct}
      pnlTone="positive"
    />
  );
};

export default DefaultTokenCard;
