import React from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenRowItem from '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import {
  DEFAULT_TOKENS_FILTER_CONTEXT,
  SEARCH_TOKENS_FILTER_CONTEXT,
  CRYPTO_MOVERS_SEARCH_FILTER_CONTEXT,
} from '../search-utils';

interface TokenRowItemProps {
  token: TrendingAsset;
  index: number;
  /** When omitted, defaults to {@link TokenDetailsSource.Trending} in the row item. */
  tokenDetailsSource?: TokenDetailsSource;
}

/** Token row used inside the home tabs. */
export const TokenRowItem: React.FC<TokenRowItemProps> = ({
  token,
  index,
  tokenDetailsSource,
}) => (
  <TrendingTokenRowItem
    token={token}
    position={index}
    filterContext={DEFAULT_TOKENS_FILTER_CONTEXT}
    tokenDetailsSource={tokenDetailsSource}
  />
);

/** Token row used inside the omni-search results. */
export const TokenSearchRowItem: React.FC<TokenRowItemProps> = ({
  token,
  index,
}) => (
  <TrendingTokenRowItem
    token={token}
    position={index}
    filterContext={SEARCH_TOKENS_FILTER_CONTEXT}
  />
);

/** "Crypto movers" search row uses a dedicated analytics context. */
export const CryptoMoversSearchRowItem: React.FC<TokenRowItemProps> = ({
  token,
  index,
}) => (
  <TrendingTokenRowItem
    token={token}
    position={index}
    filterContext={CRYPTO_MOVERS_SEARCH_FILTER_CONTEXT}
    testIdInstanceKey="crypto_movers"
  />
);
