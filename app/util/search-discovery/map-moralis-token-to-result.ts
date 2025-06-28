import { MoralisTokenResponseItem } from '@metamask/token-search-discovery-controller';
import { SearchDiscoveryCategory, TokenSearchDiscoveryResult } from '../../components/UI/SearchDiscoveryResult/types';
import { Hex } from '@metamask/utils';

export const mapMoralisTokenToResult = (token: MoralisTokenResponseItem, usdConversionRate: number | null): TokenSearchDiscoveryResult => ({
    category: SearchDiscoveryCategory.Tokens,
    name: token.token_name,
    symbol: token.token_symbol,
    address: token.token_address,
    logoUrl: token.token_logo,
    decimals: 18,
    chainId: token.chain_id as Hex,
    price: usdConversionRate ? token.price_usd / usdConversionRate : -1,
    percentChange: token.price_percent_change_usd['1d'] ?? 0,
    isFromSearch: true,
  });
