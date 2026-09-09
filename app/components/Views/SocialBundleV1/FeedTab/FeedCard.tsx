import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import FeedCardFooter from './FeedCardFooter';
import FeedCardHeader from './FeedCardHeader';
import ClosedPositionCard from './cards/ClosedPositionCard';
import DefaultTokenCard from './cards/DefaultTokenCard';
import PerpsBigPositionCard from './cards/PerpsBigPositionCard';
import TokenBigPositionCard from './cards/TokenBigPositionCard';
import type { FeedItem } from './mocks/types';

interface FeedCardProps {
  item: FeedItem;
}

/**
 * Single feed row. Shared header + optional post text + one of four position
 * card bodies + shared footer. The `default` variant intentionally has no
 * post text — that's the "no post" case Design called out.
 */
const FeedCard: React.FC<FeedCardProps> = ({ item }) => {
  const tw = useTailwind();

  return (
    <Box style={tw.style('px-4 pt-4 pb-2')}>
      <FeedCardHeader trader={item.trader} timeAgo={item.timeAgo} />

      {item.type !== 'default' ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          style={tw.style('mt-2')}
        >
          {item.postText}
        </Text>
      ) : null}

      {item.type === 'perps_big' ? <PerpsBigPositionCard item={item} /> : null}
      {item.type === 'token_big' ? <TokenBigPositionCard item={item} /> : null}
      {item.type === 'closed' ? <ClosedPositionCard item={item} /> : null}
      {item.type === 'default' ? <DefaultTokenCard item={item} /> : null}

      <FeedCardFooter footer={item.footer} />
    </Box>
  );
};

export default React.memo(FeedCard);
